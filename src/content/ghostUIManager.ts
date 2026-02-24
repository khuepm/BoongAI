// Ghost UI Manager Module
import { GhostUIElement } from '@/types';

export class GhostUIManager {
  private static elements: Map<string, GhostUIElement> = new Map();
  private static domElements: Map<string, HTMLElement> = new Map();

  static showProcessing(commentId: string): void {
    const element = this.createGhostUI(commentId, 'processing', 'AI is processing...');
    this.elements.set(commentId, element);
    this.injectGhostUI(commentId, 'processing', 'AI is processing...');
  }

  static showError(commentId: string, errorMessage: string): void {
    const element = this.createGhostUI(commentId, 'error', errorMessage);
    this.elements.set(commentId, element);
    this.injectGhostUI(commentId, 'error', errorMessage);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      this.remove(commentId);
    }, 10000);
  }

  static remove(commentId: string): void {
    const element = this.elements.get(commentId);
    if (element) {
      const domElement = this.domElements.get(commentId);
      if (domElement && domElement.parentNode) {
        domElement.parentNode.removeChild(domElement);
      }
      this.domElements.delete(commentId);
      this.elements.delete(commentId);
    }
  }

  private static createGhostUI(commentId: string, type: 'processing' | 'error', content: string): GhostUIElement {
    return {
      id: commentId,
      type,
      content,
      createdAt: Date.now()
    };
  }

  private static injectGhostUI(commentId: string, type: 'processing' | 'error', content: string): void {
    // Remove existing Ghost UI for this comment if any
    const existingElement = this.domElements.get(commentId);
    if (existingElement && existingElement.parentNode) {
      existingElement.parentNode.removeChild(existingElement);
    }

    // Find the comment element
    const commentElement = this.findCommentElement(commentId);
    if (!commentElement) {
      console.warn(`[BoongAI] Could not find comment element for ID: ${commentId}`);
      return;
    }

    // Create container element
    const container = document.createElement('div');
    container.setAttribute('data-boongai-ghost-ui', commentId);
    container.style.position = 'relative';

    // Create Shadow DOM for style isolation
    const shadowRoot = container.attachShadow({ mode: 'open' });

    // Create Ghost UI element
    const ghostUI = document.createElement('div');
    ghostUI.className = 'boongai-ghost-ui';

    // Add content
    if (type === 'processing') {
      ghostUI.innerHTML = `
        <div class="boongai-spinner"></div>
        <span class="boongai-message">${this.escapeHtml(content)}</span>
      `;
    } else {
      ghostUI.innerHTML = `
        <span class="boongai-error-icon">⚠️</span>
        <span class="boongai-message">${this.escapeHtml(content)}</span>
      `;
    }

    // Add styles
    const style = document.createElement('style');
    style.textContent = this.getStyles(type);

    // Append to shadow root
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(ghostUI);

    // Insert below comment
    if (commentElement.parentNode) {
      commentElement.parentNode.insertBefore(container, commentElement.nextSibling);
      this.domElements.set(commentId, container);
    }
  }

  private static findCommentElement(commentId: string): HTMLElement | null {
    // Try multiple strategies to find the comment element
    
    // Strategy 1: Find by data attribute (escape special characters for CSS selector)
    try {
      const escapedId = CSS.escape(commentId);
      let element = document.querySelector(`[data-comment-id="${escapedId}"]`) as HTMLElement | null;
      if (element) return element;
    } catch (e) {
      // If CSS.escape fails or selector is invalid, continue to next strategy
    }

    // Strategy 2: Find by aria-label or other Facebook-specific attributes
    try {
      const escapedId = CSS.escape(commentId);
      let element = document.querySelector(`[aria-label*="${escapedId}"]`) as HTMLElement | null;
      if (element) return element;
    } catch (e) {
      // Continue to next strategy
    }

    // Strategy 3: Find by ID if commentId is a valid DOM ID
    try {
      const element = document.getElementById(commentId) as HTMLElement | null;
      if (element) return element;
    } catch (e) {
      // Continue to next strategy
    }

    // Strategy 4: Search for comment text content (fallback)
    // This is less reliable but can work in some cases
    const allComments = document.querySelectorAll('[role="article"]');
    const commentsArray = Array.from(allComments);
    for (const comment of commentsArray) {
      if (comment.getAttribute('data-boongai-comment-id') === commentId) {
        return comment as HTMLElement;
      }
    }

    return null;
  }

  private static getStyles(type: 'processing' | 'error'): string {
    const baseStyles = `
      .boongai-ghost-ui {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        margin: 4px 0;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }

      .boongai-message {
        flex: 1;
      }

      .boongai-error-icon {
        font-size: 16px;
      }
    `;

    if (type === 'processing') {
      return baseStyles + `
        .boongai-ghost-ui {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .boongai-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
    } else {
      return baseStyles + `
        .boongai-ghost-ui {
          background: #fee;
          color: #c33;
          border: 1px solid #fcc;
        }
      `;
    }
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
