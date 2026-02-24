// Auto Injector Module
export class AutoInjector {
  static async generateReply(commentId: string, aiResponse: string): Promise<boolean> {
    // TODO: Implement reply generation
    return false;
  }

  static findReplyButton(commentId: string): HTMLElement | null {
    // Find the comment element by data attribute
    const commentElement = document.querySelector(`[data-boongai-comment-id="${commentId}"]`);
    if (!commentElement) {
      console.error(`[BoongAI] Comment element not found for ID: ${commentId}`);
      return null;
    }

    // Facebook uses various selectors for reply buttons
    // Try multiple selectors to find the reply button
    const selectors = [
      'div[role="button"][aria-label*="Reply"]',
      'div[role="button"][aria-label*="Trả lời"]', // Vietnamese
      'span:contains("Reply")',
      'span:contains("Trả lời")',
      '[data-testid*="reply"]',
      'a[href*="reply"]'
    ];

    for (const selector of selectors) {
      const button = commentElement.querySelector(selector) as HTMLElement;
      if (button) {
        return button;
      }
    }

    // If not found in comment element, try finding in parent container
    const parentContainer = commentElement.closest('[role="article"]');
    if (parentContainer) {
      for (const selector of selectors) {
        const button = parentContainer.querySelector(selector) as HTMLElement;
        if (button) {
          return button;
        }
      }
    }

    console.error(`[BoongAI] Reply button not found for comment: ${commentId}`);
    return null;
  }

  static async clickReplyButton(button: HTMLElement): Promise<void> {
    // Simulate native browser events to bypass Facebook protections
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    button.dispatchEvent(clickEvent);

    // Wait for reply input field to appear (100-200ms delay)
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  static async injectText(inputField: HTMLElement, text: string): Promise<void> {
    // Format the text with prefix and preserve line breaks
    const formattedText = this.formatReply(text);

    try {
      // Method 1: Try clipboard API (most reliable for Facebook)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedText);
        
        // Focus the input field
        inputField.focus();
        
        // Trigger paste event
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer()
        });
        
        // Add text to clipboard data
        pasteEvent.clipboardData?.setData('text/plain', formattedText);
        inputField.dispatchEvent(pasteEvent);
        
        // Wait for paste to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        // Fallback: Direct DOM manipulation
        await this.injectTextDirectly(inputField, formattedText);
      }

      // Trigger React/Facebook events for compatibility
      this.triggerInputEvents(inputField, formattedText);
      
    } catch (error) {
      console.error('[BoongAI] Clipboard API failed, using direct injection:', error);
      // Fallback to direct DOM manipulation
      await this.injectTextDirectly(inputField, formattedText);
      this.triggerInputEvents(inputField, formattedText);
    }
  }

  private static async injectTextDirectly(inputField: HTMLElement, text: string): Promise<void> {
    // Check if it's a contenteditable element (Facebook uses these)
    if (inputField.isContentEditable) {
      inputField.textContent = text;
    } else if (inputField instanceof HTMLInputElement || inputField instanceof HTMLTextAreaElement) {
      inputField.value = text;
    } else {
      // Try to find the actual input element within the container
      const actualInput = inputField.querySelector('[contenteditable="true"]') as HTMLElement;
      if (actualInput) {
        actualInput.textContent = text;
      } else {
        throw new Error('Could not find editable element');
      }
    }
  }

  private static triggerInputEvents(inputField: HTMLElement, text: string): void {
    // Trigger input event for React
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      data: text,
      inputType: 'insertText'
    });
    inputField.dispatchEvent(inputEvent);

    // Trigger change event
    const changeEvent = new Event('change', {
      bubbles: true,
      cancelable: true
    });
    inputField.dispatchEvent(changeEvent);

    // Trigger keydown event (some frameworks need this)
    const keydownEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'a',
      code: 'KeyA'
    });
    inputField.dispatchEvent(keydownEvent);
  }

  static async submitReply(inputField: HTMLElement): Promise<void> {
    // TODO: Submit the reply
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
      formatted = formatted.substring(0, 8000) + '... (nội dung đã được rút gọn)';
    }
    
    return formatted;
  }

  static sanitizeContent(content: string): string {
    // Remove malicious scripts and HTML injection attempts
    let sanitized = content;
    
    // Remove script tags (case-insensitive, handles various formats)
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove event handlers (onclick, onerror, onload, etc.)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
    
    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    // Remove data: URLs that could contain scripts
    sanitized = sanitized.replace(/data:text\/html[^"'\s]*/gi, '');
    
    // Remove iframe tags
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    
    // Remove object and embed tags
    sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');
    
    // Remove form tags
    sanitized = sanitized.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
    
    // Remove meta tags
    sanitized = sanitized.replace(/<meta\b[^>]*>/gi, '');
    
    return sanitized;
  }

  private static removeUnsupportedMarkdown(content: string): string {
    // Facebook doesn't support most markdown, so we remove it
    let cleaned = content;
    
    // Remove markdown headers (# ## ###)
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
    
    // Remove markdown bold (**text** or __text__)
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
    
    // Remove markdown italic (*text* or _text_)
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
    
    // Remove markdown code blocks (```code```)
    cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
      // Extract code content without backticks
      return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
    });
    
    // Remove inline code (`code`)
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
    
    // Remove markdown links [text](url) - keep only text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Remove markdown images ![alt](url)
    cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
    
    // Remove markdown horizontal rules (---, ***, ___)
    cleaned = cleaned.replace(/^[\-*_]{3,}\s*$/gm, '');
    
    // Remove markdown blockquotes (> text)
    cleaned = cleaned.replace(/^>\s+/gm, '');
    
    // Remove markdown list markers (-, *, +, 1.)
    cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '');
    cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '');
    
    return cleaned;
  }
}
