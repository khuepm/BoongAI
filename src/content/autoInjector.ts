// Auto Injector Module
export class AutoInjector {
  /**
   * Generate a randomized humanization delay between 500ms and 1500ms.
   * Uses Math.random() to simulate natural human interaction timing.
   */
  static generateHumanizationDelay(): number {
    return Math.floor(Math.random() * 1000) + 500;
  }

  /**
   * Calculate the pre-submit delay needed to bring total auto-reply time
   * into the 3-5 second range for natural human pacing.
   * Returns 0 if enough time has already elapsed.
   */
  static calculatePreSubmitDelay(elapsedMs: number): number {
    const targetMin = 3000; // minimum 3 seconds total
    const targetMax = 5000; // maximum 5 seconds total
    const submitDelay = 200; // base submit wait time
    if (elapsedMs >= targetMin - submitDelay) {
      return 0;
    }
    const remainingMin = targetMin - elapsedMs - submitDelay;
    const remainingMax = Math.min(
      targetMax - elapsedMs - submitDelay,
      remainingMin + 1000,
    );
    return (
      Math.floor(Math.random() * (remainingMax - remainingMin + 1)) +
      remainingMin
    );
  }

  static async generateReply(
    commentId: string,
    aiResponse: string,
  ): Promise<boolean> {
    try {
      const startTime = Date.now();
      console.log(
        `[BoongAI AutoInjector] ========== STARTING REPLY INJECTION ==========`,
      );
      console.log(`[BoongAI AutoInjector] Comment ID: ${commentId}`);
      console.log(
        `[BoongAI AutoInjector] Response length: ${aiResponse.length}`,
      );

      // Step 1: Find reply button
      console.log("[BoongAI AutoInjector] Step 1: Finding reply button...");
      const replyButton = this.findReplyButton(commentId);
      if (!replyButton) {
        console.error(
          "[BoongAI AutoInjector] ❌ Reply button not found for comment:",
          commentId,
        );
        console.error(
          "[BoongAI AutoInjector] Comment element exists:",
          !!document.querySelector(`[data-boongai-comment-id="${commentId}"]`),
        );
        return false;
      }
      console.log("[BoongAI AutoInjector] ✅ Reply button found:", replyButton);

      // Step 1.5: Track existing contenteditable elements before clicking
      const existingEditables = new Set<Element>(
        Array.from(document.querySelectorAll('[contenteditable="true"]')),
      );
      console.log(
        "[BoongAI AutoInjector] Existing contenteditable count:",
        existingEditables.size,
      );

      // Step 2: Click reply button to open input field
      console.log("[BoongAI AutoInjector] Step 2: Clicking reply button...");
      await this.clickReplyButton(replyButton);
      console.log("[BoongAI AutoInjector] ✅ Reply button clicked");

      // Step 3: Wait for input field to appear
      console.log(
        "[BoongAI AutoInjector] Step 3: Waiting for input field to appear...",
      );
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 4: Find the reply input field (newly appeared)
      console.log(
        "[BoongAI AutoInjector] Step 4: Finding reply input field...",
      );
      const inputField = this.findReplyInputField(commentId, existingEditables);
      if (!inputField) {
        console.error("[BoongAI AutoInjector] ❌ Reply input field not found");
        console.error(
          "[BoongAI AutoInjector] Available contenteditable elements:",
          document.querySelectorAll('[contenteditable="true"]').length,
        );
        return false;
      }
      console.log("[BoongAI AutoInjector] ✅ Input field found:", inputField);

      // Step 5: Inject AI response text (without auto-submit)
      console.log("[BoongAI AutoInjector] Step 5: Injecting text...");
      await this.injectText(inputField, aiResponse);
      console.log("[BoongAI AutoInjector] ✅ Text injected");

      // Focus the input field so user can see and edit the response
      inputField.focus();
      console.log("[BoongAI AutoInjector] ✅ Input field focused");

      // Scroll input field into view
      inputField.scrollIntoView({ behavior: "smooth", block: "center" });
      console.log("[BoongAI AutoInjector] ✅ Input field scrolled into view");

      const totalTime = Date.now() - startTime;
      console.log(
        `[BoongAI AutoInjector] ========== REPLY INJECTION SUCCESS (${totalTime}ms) ==========`,
      );
      return true;
    } catch (error) {
      console.error("[BoongAI AutoInjector] ❌ Error injecting reply:", error);
      console.error(
        "[BoongAI AutoInjector] Error stack:",
        (error as Error).stack,
      );
      return false;
    }
  }

  private static findReplyInputField(
    commentId: string,
    existingEditables: Set<Element>,
  ): HTMLElement | null {
    console.log("[BoongAI AutoInjector] Searching for reply input field...");

    // Find the comment element to establish proximity
    const commentElement = document.querySelector(
      `[data-boongai-comment-id="${commentId}"]`,
    );
    if (!commentElement) {
      console.error("[BoongAI AutoInjector] Comment element not found");
      return null;
    }

    // Strategy 1: Find newly appeared contenteditable elements
    const allEditables = document.querySelectorAll('[contenteditable="true"]');
    console.log(
      "[BoongAI AutoInjector] Total contenteditable elements:",
      allEditables.length,
    );
    console.log(
      "[BoongAI AutoInjector] Existing elements:",
      existingEditables.size,
    );

    const newEditables: HTMLElement[] = [];
    allEditables.forEach((editable) => {
      if (!existingEditables.has(editable)) {
        newEditables.push(editable as HTMLElement);
      }
    });

    console.log(
      "[BoongAI AutoInjector] Newly appeared editables:",
      newEditables.length,
    );

    // Strategy 2: Among new editables, find the one closest to the comment
    if (newEditables.length > 0) {
      let closestEditable: HTMLElement | null = null;
      let minDistance = Infinity;

      for (const editable of newEditables) {
        const distance = this.getElementDistance(commentElement, editable);
        console.log(
          "[BoongAI AutoInjector] New editable distance:",
          distance,
          editable,
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestEditable = editable;
        }
      }

      if (closestEditable) {
        console.log(
          "[BoongAI AutoInjector] Selected closest new editable:",
          closestEditable,
        );
        return closestEditable;
      }
    }

    // Strategy 3: If no new editables, find focused or empty editable near comment
    console.log(
      "[BoongAI AutoInjector] No new editables, searching for focused/empty near comment...",
    );
    const nearbyEditables: Array<{ element: HTMLElement; distance: number }> =
      [];

    allEditables.forEach((editable) => {
      const distance = this.getElementDistance(
        commentElement,
        editable as HTMLElement,
      );
      if (distance < 5000) {
        // Within reasonable DOM distance
        nearbyEditables.push({ element: editable as HTMLElement, distance });
      }
    });

    // Sort by distance
    nearbyEditables.sort((a, b) => a.distance - b.distance);
    console.log(
      "[BoongAI AutoInjector] Nearby editables:",
      nearbyEditables.length,
    );

    // Find focused or empty among nearby
    for (const { element } of nearbyEditables) {
      const text = element.textContent?.trim() || "";
      const isFocused = document.activeElement === element;
      const isEmpty = text.length === 0;

      console.log("[BoongAI AutoInjector] Checking nearby:", {
        isEmpty,
        isFocused,
        text: text.substring(0, 30),
      });

      if (isFocused || isEmpty) {
        console.log(
          "[BoongAI AutoInjector] Selected nearby editable:",
          element,
        );
        return element;
      }
    }

    // Fallback: return closest nearby editable
    if (nearbyEditables.length > 0) {
      console.log(
        "[BoongAI AutoInjector] Using closest nearby as fallback:",
        nearbyEditables[0].element,
      );
      return nearbyEditables[0].element;
    }

    console.error("[BoongAI AutoInjector] No suitable input field found");
    return null;
  }

  /**
   * Calculate DOM distance between two elements using TreeWalker
   */
  private static getElementDistance(from: Element, to: Element): number {
    // Find common ancestor
    const commonAncestor = this.findCommonAncestor(from, to);
    if (!commonAncestor) return Infinity;

    const walker = document.createTreeWalker(
      commonAncestor,
      NodeFilter.SHOW_ELEMENT,
    );
    let fromPos = -1;
    let toPos = -1;
    let pos = 0;

    let node: Node | null = walker.currentNode;
    while (node) {
      if (node === from) fromPos = pos;
      if (node === to) toPos = pos;
      if (fromPos >= 0 && toPos >= 0) break;
      node = walker.nextNode();
      pos++;
    }

    if (fromPos < 0 || toPos < 0) return Infinity;
    return Math.abs(fromPos - toPos);
  }

  /**
   * Find common ancestor of two elements
   */
  private static findCommonAncestor(
    elem1: Element,
    elem2: Element,
  ): Element | null {
    const ancestors1 = new Set<Element>();
    let current: Element | null = elem1;

    while (current) {
      ancestors1.add(current);
      current = current.parentElement;
    }

    current = elem2;
    while (current) {
      if (ancestors1.has(current)) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  static findReplyButton(commentId: string): HTMLElement | null {
    // Step 1: Find the comment element by data attribute
    const commentElement = document.querySelector(
      `[data-boongai-comment-id="${commentId}"]`,
    );
    if (!commentElement) {
      console.error(`[BoongAI] Comment element not found for ID: ${commentId}`);
      return null;
    }

    // Facebook reply button selectors (English + Vietnamese)
    const replyButtonSelectors = [
      'div[role="button"][aria-label*="Reply"]',
      'div[role="button"][aria-label*="Trả lời"]',
      '[data-testid*="reply"]',
      'a[href*="reply"]',
    ];

    // Text-based matching patterns for reply buttons
    const replyTextPatterns = [/^Reply$/i, /^Trả lời$/i];

    // Step 2: Use closest DOM relative traversal from the comment element.
    // Walk up through ancestors to find the tightest container that holds
    // both the comment and its reply button, checking at each level.
    // This ensures we pick the reply button structurally bound to THIS comment,
    // not one belonging to a sibling or parent comment.

    // Candidate container selectors, ordered from tightest to broadest scope
    const containerSelectors = [
      '[role="article"]',
      '[data-testid*="comment"]',
      "li",
      ".comment",
    ];

    // First, try to find the reply button directly inside the comment element itself
    const directMatch = this.findReplyButtonInContainer(
      commentElement,
      replyButtonSelectors,
      replyTextPatterns,
    );
    if (directMatch) {
      return directMatch;
    }

    // Step 3: Walk up through ancestors using closest() for each container selector.
    // At each level, verify the found button is the closest one to our comment element
    // by ensuring no other comment element sits between the button and our comment.
    for (const containerSelector of containerSelectors) {
      const container = commentElement.closest(containerSelector);
      if (!container) continue;

      const candidate = this.findReplyButtonInContainer(
        container,
        replyButtonSelectors,
        replyTextPatterns,
      );
      if (
        candidate &&
        this.isClosestReplyButton(candidate, commentElement, container)
      ) {
        return candidate;
      }
    }

    // Step 4: Fallback — check immediate parent chain (up to 5 levels)
    let current: Element | null = commentElement.parentElement;
    for (let depth = 0; depth < 5 && current; depth++) {
      const candidate = this.findReplyButtonInContainer(
        current,
        replyButtonSelectors,
        replyTextPatterns,
      );
      if (
        candidate &&
        this.isClosestReplyButton(candidate, commentElement, current)
      ) {
        return candidate;
      }
      current = current.parentElement;
    }

    console.error(`[BoongAI] Reply button not found for comment: ${commentId}`);
    return null;
  }

  /**
   * Search for a reply button within a given container using selector-based
   * and text-based matching strategies.
   */
  private static findReplyButtonInContainer(
    container: Element,
    selectors: string[],
    textPatterns: RegExp[],
  ): HTMLElement | null {
    // Try CSS selectors first
    for (const selector of selectors) {
      const button = container.querySelector(selector) as HTMLElement;
      if (button) {
        return button;
      }
    }

    // Fallback: text-based matching for spans/divs that contain "Reply" or "Trả lời"
    const candidates = container.querySelectorAll(
      'span, div[role="button"], a',
    );
    for (const candidate of Array.from(candidates)) {
      const text = candidate.textContent?.trim() ?? "";
      for (const pattern of textPatterns) {
        if (pattern.test(text)) {
          return candidate as HTMLElement;
        }
      }
    }

    return null;
  }

  /**
   * Verify that a candidate reply button is structurally closest to the target
   * comment element within the given container. This prevents picking a reply
   * button that belongs to a different comment when multiple comments share
   * the same container.
   */
  private static isClosestReplyButton(
    button: Element,
    commentElement: Element,
    container: Element,
  ): boolean {
    // Find all comment elements within this container
    const allComments = container.querySelectorAll("[data-boongai-comment-id]");
    if (allComments.length <= 1) {
      // Only one comment in this container — the button must belong to it
      return true;
    }

    // If the button is inside a different comment element, it's not ours
    for (const comment of Array.from(allComments)) {
      if (comment !== commentElement && comment.contains(button)) {
        return false;
      }
    }

    // If the button is inside our comment element — ideal case
    if (commentElement.contains(button)) {
      return true;
    }

    // The button is outside all comment elements but within the container.
    // Find the closest comment to the button by DOM tree distance.
    let closestComment: Element | null = null;
    let minDistance = Infinity;

    for (const comment of Array.from(allComments)) {
      const distance = this.domDistance(button, comment, container);
      if (distance < minDistance) {
        minDistance = distance;
        closestComment = comment;
      }
    }

    return closestComment === commentElement;
  }

  /**
   * Calculate a simple DOM distance between two elements within a container.
   * Uses document-order position via TreeWalker as a proxy for structural proximity.
   */
  private static domDistance(
    a: Element,
    b: Element,
    container: Element,
  ): number {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_ELEMENT,
    );
    let posA = -1;
    let posB = -1;
    let index = 0;

    let node: Node | null = walker.currentNode;
    while (node) {
      if (node === a) posA = index;
      if (node === b) posB = index;
      if (posA >= 0 && posB >= 0) break;
      node = walker.nextNode();
      index++;
    }

    if (posA < 0 || posB < 0) return Infinity;
    return Math.abs(posA - posB);
  }

  static async clickReplyButton(button: HTMLElement): Promise<void> {
    // Simulate native browser events to bypass Facebook protections
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    button.dispatchEvent(clickEvent);

    // Wait for reply input field to appear (100-200ms delay)
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  static async injectText(
    inputField: HTMLElement,
    text: string,
  ): Promise<void> {
    // Format the text with prefix and preserve line breaks
    const formattedText = this.formatReply(text);
    console.log(
      "[BoongAI AutoInjector] Formatted text length:",
      formattedText.length,
    );
    console.log(
      "[BoongAI AutoInjector] Formatted text preview:",
      formattedText.substring(0, 100),
    );

    try {
      // Method 1: Direct DOM manipulation (most reliable for Facebook contenteditable)
      console.log("[BoongAI AutoInjector] Using direct DOM injection...");
      await this.injectTextDirectly(inputField, formattedText);
      console.log("[BoongAI AutoInjector] Direct injection complete");

      // Trigger React/Facebook events for compatibility
      console.log("[BoongAI AutoInjector] Triggering input events...");
      this.triggerInputEvents(inputField, formattedText);
      console.log("[BoongAI AutoInjector] Input events triggered");
    } catch (error) {
      console.error(
        "[BoongAI] Clipboard API failed, using direct injection:",
        error,
      );
      // Fallback to direct DOM manipulation
      await this.injectTextDirectly(inputField, formattedText);
      this.triggerInputEvents(inputField, formattedText);
    }
  }

  private static async injectTextDirectly(
    inputField: HTMLElement,
    text: string,
  ): Promise<void> {
    // Check if it's a contenteditable element (Facebook uses these)
    // Also check the attribute directly for environments where isContentEditable is not implemented
    if (
      inputField.isContentEditable ||
      inputField.getAttribute("contenteditable") === "true"
    ) {
      inputField.textContent = text;
    } else if (
      inputField instanceof HTMLInputElement ||
      inputField instanceof HTMLTextAreaElement
    ) {
      inputField.value = text;
    } else {
      // Try to find the actual input element within the container
      const actualInput = inputField.querySelector(
        '[contenteditable="true"]',
      ) as HTMLElement;
      if (actualInput) {
        actualInput.textContent = text;
      } else {
        throw new Error("Could not find editable element");
      }
    }
  }

  private static triggerInputEvents(
    inputField: HTMLElement,
    text: string,
  ): void {
    // Trigger input event for React
    const inputEvent = new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      data: text,
      inputType: "insertText",
    });
    inputField.dispatchEvent(inputEvent);

    // Trigger change event
    const changeEvent = new Event("change", {
      bubbles: true,
      cancelable: true,
    });
    inputField.dispatchEvent(changeEvent);

    // Trigger keydown event (some frameworks need this)
    const keydownEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "a",
      code: "KeyA",
    });
    inputField.dispatchEvent(keydownEvent);
  }

  static async submitReply(inputField: HTMLElement): Promise<void> {
    // Method 1: Try to find and click the submit button
    const submitButton = this.findSubmitButton(inputField);
    if (submitButton) {
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      submitButton.dispatchEvent(clickEvent);

      // Wait for submission to complete
      await new Promise((resolve) => setTimeout(resolve, 200));
      return;
    }

    // Method 2: Simulate Enter key press
    const enterEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
    });
    inputField.dispatchEvent(enterEvent);

    // Also trigger keypress and keyup for compatibility
    const keypressEvent = new KeyboardEvent("keypress", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
    });
    inputField.dispatchEvent(keypressEvent);

    const keyupEvent = new KeyboardEvent("keyup", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
    });
    inputField.dispatchEvent(keyupEvent);

    // Wait for submission to complete
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  private static findSubmitButton(inputField: HTMLElement): HTMLElement | null {
    // Find the submit button near the input field
    const container = inputField.closest(
      '[role="dialog"], [role="article"], form, .comment-form',
    );
    if (!container) {
      return null;
    }

    // Try multiple selectors for submit button
    const selectors = [
      'button[type="submit"]',
      'div[role="button"][aria-label*="Post"]',
      'div[role="button"][aria-label*="Đăng"]', // Vietnamese
      'button[aria-label*="Comment"]',
      'button[aria-label*="Reply"]',
      '[data-testid*="submit"]',
      '[data-testid*="post"]',
    ];

    for (const selector of selectors) {
      const button = container.querySelector(selector) as HTMLElement;
      if (button) {
        return button;
      }
    }

    return null;
  }

  static formatReply(aiResponse: string): string {
    // First, sanitize the content
    let sanitized = this.sanitizeContent(aiResponse);

    // Remove unsupported markdown formatting
    sanitized = this.removeUnsupportedMarkdown(sanitized);

    // Add prefix
    let formatted = `[🤖 BoongAI trả lời]: ${sanitized}`;

    // Truncate if exceeds 8000 characters
    if (formatted.length > 8000) {
      formatted =
        formatted.substring(0, 8000) + "... (nội dung đã được rút gọn)";
    }

    return formatted;
  }

  static sanitizeContent(content: string): string {
    // Remove malicious scripts and HTML injection attempts
    let sanitized = content;

    // Remove script tags (case-insensitive, handles various formats)
    sanitized = sanitized.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    );

    // Remove event handlers (onclick, onerror, onload, etc.)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, "");

    // Remove data: URLs that could contain scripts
    sanitized = sanitized.replace(/data:text\/html[^"'\s]*/gi, "");

    // Remove iframe tags
    sanitized = sanitized.replace(
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      "",
    );

    // Remove object and embed tags
    sanitized = sanitized.replace(
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      "",
    );
    sanitized = sanitized.replace(/<embed\b[^>]*>/gi, "");

    // Remove form tags
    sanitized = sanitized.replace(
      /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
      "",
    );

    // Remove meta tags
    sanitized = sanitized.replace(/<meta\b[^>]*>/gi, "");

    return sanitized;
  }

  private static removeUnsupportedMarkdown(content: string): string {
    // Facebook doesn't support most markdown, so we remove it
    let cleaned = content;

    // Remove markdown headers (# ## ###)
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

    // Remove markdown bold (**text** or __text__)
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
    cleaned = cleaned.replace(/__([^_]+)__/g, "$1");

    // Remove markdown italic (*text* or _text_)
    cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
    cleaned = cleaned.replace(/_([^_]+)_/g, "$1");

    // Remove markdown code blocks (```code```)
    cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
      // Extract code content without backticks
      return match.replace(/```\w*\n?/g, "").replace(/```/g, "");
    });

    // Remove inline code (`code`)
    cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

    // Remove markdown links [text](url) - keep only text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    // Remove markdown images ![alt](url)
    cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

    // Remove markdown horizontal rules (---, ***, ___)
    cleaned = cleaned.replace(/^[\-*_]{3,}\s*$/gm, "");

    // Remove markdown blockquotes (> text)
    cleaned = cleaned.replace(/^>\s+/gm, "");

    // Remove markdown list markers (-, *, +, 1.)
    cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, "");
    cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, "");

    return cleaned;
  }
}
