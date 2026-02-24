// Context Scraper Module
import { PostContent } from '@/types';

export class ContextScraper {
  private static readonly EXTRACTION_TIMEOUT = 2000; // 2 seconds
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY = 500; // 500ms

  /**
   * Extract complete post content from Facebook DOM
   */
  static async extractPostContent(postId: string): Promise<PostContent> {
    const startTime = Date.now();
    
    try {
      // Find the post container
      const postElement = this.findPostContainer(postId);
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
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        // Check if this element or its parent contains the postId
        const htmlElement = element as HTMLElement;
        if (this.elementMatchesPostId(htmlElement, postId)) {
          return htmlElement;
        }
      }
    }

    // Fallback: search by data attributes
    const allArticles = document.querySelectorAll('[role="article"]');
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
   * Detect and click "See more" button to expand full content
   */
  static async expandSeeMore(postElement: HTMLElement): Promise<boolean> {
    const seeMoreButton = this.findSeeMoreButton(postElement);
    
    if (!seeMoreButton) {
      return true; // No "See more" button, content is already complete
    }

    // Click the button
    try {
      for (let attempt = 0; attempt < this.MAX_RETRY_ATTEMPTS; attempt++) {
        seeMoreButton.click();
        
        // Wait for content to expand
        await this.delay(this.RETRY_DELAY);
        
        // Check if button is gone (content expanded)
        if (!this.findSeeMoreButton(postElement)) {
          return true;
        }
      }
      
      return false; // Failed to expand after max attempts
    } catch (error) {
      console.error('[ContextScraper] Failed to expand "See more":', error);
      return false;
    }
  }

  /**
   * Find "See more" button in post element
   */
  private static findSeeMoreButton(postElement: HTMLElement): HTMLElement | null {
    // Common selectors for "See more" buttons on Facebook
    const seeMoreTexts = ['See more', 'Xem thêm', 'See More', 'More'];
    
    // Try role-based selectors
    const buttons = postElement.querySelectorAll('[role="button"]');
    for (const button of buttons) {
      const text = button.textContent?.trim() || '';
      if (seeMoreTexts.some(seeMore => text.includes(seeMore))) {
        return button as HTMLElement;
      }
    }

    // Try link-based selectors
    const links = postElement.querySelectorAll('a, span[role="button"]');
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
