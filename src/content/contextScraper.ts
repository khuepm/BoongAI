// Context Scraper Module
import { PostContent } from '@/types';

export class ContextScraper {
  private static readonly SEE_MORE_TIMEOUT = 3000; // 3 seconds max wait for DOM mutation

  /**
   * Extract complete post content from Facebook DOM
   */
  static async extractPostContent(postId: string, commentElement?: HTMLElement): Promise<PostContent> {
    try {
      // Find the post container - prefer using commentElement if provided
      let postElement: HTMLElement | null = null;
      
      if (commentElement) {
        postElement = this.findPostContainerFromComment(commentElement);
      }
      
      if (!postElement) {
        postElement = this.findPostContainer(postId);
      }
      
      if (!postElement) {
        throw new Error(`Post container not found for postId: ${postId}`);
      }

      // Expand "See more" if present
      const expanded = await this.expandSeeMore(postElement);

      // Extract text content
      const rawText = this.extractTextContent(postElement);
      
      // Filter out UI elements
      const cleanContent = this.filterUIElements(rawText);

      return {
        postId,
        content: cleanContent,
        extractedAt: Date.now(),
        isComplete: expanded || !this.hasSeeMoreButton(postElement)
      };
    } catch (error) {
      console.error('[ContextScraper] Extraction failed:', error);
      return {
        postId,
        content: '',
        extractedAt: Date.now(),
        isComplete: false
      };
    }
  }

  /**
   * Find post container by traversing up from comment element
   * This is more reliable than searching by postId
   */
  static findPostContainerFromComment(commentElement: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = commentElement;
    let depth = 0;
    const maxDepth = 15; // Traverse up to 15 levels
    
    while (current && current !== document.body && depth < maxDepth) {
      // Check if this is a post container
      if (current.getAttribute('role') === 'article') {
        return current;
      }
      
      // Check for common post container classes/attributes
      const classList = current.className || '';
      if (classList.includes('userContentWrapper') || 
          classList.includes('fbUserContent') ||
          current.hasAttribute('data-pagelet') && current.getAttribute('data-pagelet')?.includes('FeedUnit')) {
        return current;
      }
      
      current = current.parentElement;
      depth++;
    }
    
    return null;
  }

  /**
   * Locate post DOM element by postId
   * Facebook uses data-testid or aria-label attributes for posts
   */
  static findPostContainer(postId: string): HTMLElement | null {
    // Try multiple selectors for Facebook post containers
    const selectors = [
      `[data-testid="post_message"]`,
      `[role="article"]`,
      `[data-pagelet*="FeedUnit"]`,
      `.userContentWrapper`,
      `[id*="${postId}"]`
    ];

    for (const selector of selectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      for (const element of elements) {
        // Check if this element or its parent contains the postId
        const htmlElement = element as HTMLElement;
        if (this.elementMatchesPostId(htmlElement, postId)) {
          return htmlElement;
        }
      }
    }

    // Fallback: search by data attributes
    const allArticles = Array.from(document.querySelectorAll('[role="article"]'));
    for (const article of allArticles) {
      const htmlElement = article as HTMLElement;
      if (this.elementMatchesPostId(htmlElement, postId)) {
        return htmlElement;
      }
    }

    return null;
  }

  /**
   * Check if element matches the given postId
   */
  private static elementMatchesPostId(element: HTMLElement, postId: string): boolean {
    // Check element's own attributes
    const elementId = element.id || element.getAttribute('data-post-id') || '';
    if (elementId.includes(postId)) {
      return true;
    }

    // Check parent elements
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
      const parentId = parent.id || parent.getAttribute('data-post-id') || '';
      if (parentId.includes(postId)) {
        return true;
      }
      parent = parent.parentElement;
      depth++;
    }

    return false;
  }

  /**
   * Detect and click "See more" button to expand full content.
   * Uses MutationObserver to wait for DOM mutation completion (up to 3 seconds).
   */
  static async expandSeeMore(postElement: HTMLElement): Promise<boolean> {
    const seeMoreButton = this.findSeeMoreButton(postElement);
    
    if (!seeMoreButton) {
      return true; // No "See more" button, content is already complete
    }

    try {
      // Set up MutationObserver before clicking to catch the DOM mutation
      const mutationComplete = this.waitForDOMMutation(postElement);

      // Click the "See more" button
      seeMoreButton.click();

      // Wait for DOM mutation to complete (or timeout after 3 seconds)
      const mutated = await mutationComplete;

      return mutated;
    } catch (error) {
      console.error('[ContextScraper] Failed to expand "See more":', error);
      return false;
    }
  }

  /**
   * Wait for DOM mutation on the post element using MutationObserver.
   * Resolves true when mutation is detected, false on timeout.
   * Maximum wait: 3 seconds.
   */
  private static waitForDOMMutation(postElement: HTMLElement): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let resolved = false;

      const observer = new MutationObserver(() => {
        if (!resolved) {
          resolved = true;
          observer.disconnect();
          resolve(true);
        }
      });

      observer.observe(postElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      // Timeout fallback: resolve false after SEE_MORE_TIMEOUT
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          observer.disconnect();
          resolve(false);
        }
      }, this.SEE_MORE_TIMEOUT);
    });
  }

  /**
   * Find "See more" button in post element
   */
  private static findSeeMoreButton(postElement: HTMLElement): HTMLElement | null {
    // Common selectors for "See more" buttons on Facebook
    const seeMoreTexts = ['See more', 'Xem thêm', 'See More', 'More'];
    
    // Try role-based selectors
    const buttons = Array.from(postElement.querySelectorAll('[role="button"]'));
    for (const button of buttons) {
      const text = button.textContent?.trim() || '';
      if (seeMoreTexts.some(seeMore => text.includes(seeMore))) {
        return button as HTMLElement;
      }
    }

    // Try link-based selectors
    const links = Array.from(postElement.querySelectorAll('a, span[role="button"]'));
    for (const link of links) {
      const text = link.textContent?.trim() || '';
      if (seeMoreTexts.some(seeMore => text.includes(seeMore))) {
        return link as HTMLElement;
      }
    }

    return null;
  }

  /**
   * Check if post has "See more" button
   */
  private static hasSeeMoreButton(postElement: HTMLElement): boolean {
    return this.findSeeMoreButton(postElement) !== null;
  }

  /**
   * Extract all visible text content from post element
   */
  static extractTextContent(postElement: HTMLElement): string {
    // Clone the element to avoid modifying the original DOM
    const clone = postElement.cloneNode(true) as HTMLElement;

    // Remove script and style elements
    const scriptsAndStyles = clone.querySelectorAll('script, style');
    scriptsAndStyles.forEach(el => el.remove());

    // Get text content
    const text = clone.textContent || '';
    
    return text;
  }

  /**
   * Filter out UI elements like like counts, timestamps, buttons
   */
  static filterUIElements(textContent: string): string {
    // Remove extra whitespace and newlines
    let cleaned = textContent.replace(/\s+/g, ' ').trim();

    // Common UI element patterns to remove
    const uiPatterns = [
      /\d+\s*(Like|Likes|Comment|Comments|Share|Shares)/gi,
      /\d+\s*(Thích|Bình luận|Chia sẻ)/gi,
      /\d+[KkMm]?\s*(Like|Likes|Comment|Comments|Share|Shares)/gi,
      /Just now|(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/gi,
      /Vừa xong|(\d+)\s*(giây|phút|giờ|ngày|tuần|tháng|năm)\s*trước/gi,
      /Sponsored|Được tài trợ/gi,
      /See more|Xem thêm/gi,
      /See less|Ẩn bớt/gi,
      /\d+\s*views?/gi,
      /\d+\s*lượt xem/gi
    ];

    // Apply each pattern
    for (const pattern of uiPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Remove multiple spaces again after filtering
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Parse user request from command comment text
   * Extracts text following @BoongAI mention
   */
  static parseUserRequest(commentText: string): string {
    const mentionPattern = /@BoongAI\s+(.+)/i;
    const match = commentText.match(mentionPattern);
    
    if (match && match[1]) {
      return match[1].trim();
    }

    return '';
  }

  /**
   * Package user request and post content for AI processing
   */
  static packageRequest(userRequest: string, postContent: PostContent): {
    userRequest: string;
    postContent: string;
    postId: string;
  } {
    return {
      userRequest,
      postContent: postContent.content,
      postId: postContent.postId
    };
  }

  /**
   * Utility: Delay execution
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
