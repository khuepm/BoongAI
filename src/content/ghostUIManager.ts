// Ghost UI Manager Module
import { GhostUIElement } from "@/types";

export class GhostUIManager {
  private static elements: Map<string, GhostUIElement> = new Map();
  private static domElements: Map<string, HTMLElement> = new Map();
  private static processingTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map();

  static showProcessing(
    commentId: string,
    timeoutMs: number = 60000,
    onTimeout?: (commentId: string) => void,
  ): void {
    const element = this.createGhostUI(
      commentId,
      "processing",
      "AI is processing...",
    );
    this.elements.set(commentId, element);
    this.injectGhostUI(commentId, "processing", "AI is processing...");

    // Auto-timeout to prevent infinite spinner
    const timer = setTimeout(() => {
      this.processingTimers.delete(commentId);
      if (this.elements.get(commentId)?.type === "processing") {
        this.remove(commentId);
        if (onTimeout) {
          onTimeout(commentId);
        } else {
          this.showError(commentId, "Request timed out. Please try again.");
        }
      }
    }, timeoutMs);
    this.processingTimers.set(commentId, timer);
  }

  static showError(
    commentId: string,
    errorMessage: string,
    onRetry?: () => void,
  ): void {
    const element = this.createGhostUI(commentId, "error", errorMessage);
    this.elements.set(commentId, element);
    this.injectGhostUI(commentId, "error", errorMessage, onRetry);

    // Auto-remove after 30s (with retry button) or 10s (without)
    setTimeout(
      () => {
        this.remove(commentId);
      },
      onRetry ? 30000 : 10000,
    );
  }

  static showSuccess(
    commentId: string,
    aiResponse: string,
    onAccept?: () => void,
  ): void {
    const element = this.createGhostUI(commentId, "success", aiResponse);
    this.elements.set(commentId, element);
    this.injectGhostUI(commentId, "success", aiResponse, undefined, onAccept);
  }

  static remove(commentId: string): void {
    // Cancel any pending processing timeout
    const timer = this.processingTimers.get(commentId);
    if (timer) {
      clearTimeout(timer);
      this.processingTimers.delete(commentId);
    }

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

  private static createGhostUI(
    commentId: string,
    type: "processing" | "error" | "success",
    content: string,
  ): GhostUIElement {
    return {
      id: commentId,
      type,
      content,
      createdAt: Date.now(),
    };
  }

  private static injectGhostUI(
    commentId: string,
    type: "processing" | "error" | "success",
    content: string,
    onRetry?: () => void,
    onAccept?: () => void,
  ): void {
    // Remove existing Ghost UI for this comment if any
    const existingElement = this.domElements.get(commentId);
    if (existingElement && existingElement.parentNode) {
      existingElement.parentNode.removeChild(existingElement);
    }

    // Find the comment element
    const commentElement = this.findCommentElement(commentId);
    if (!commentElement) {
      console.warn(
        `[BoongAI] Could not find comment element for ID: ${commentId}`,
      );
      return;
    }

    // Create container element
    const container = document.createElement("div");
    container.setAttribute("data-boongai-ghost-ui", commentId);
    container.style.position = "relative";

    // Create Shadow DOM for style isolation
    const shadowRoot = container.attachShadow({ mode: "open" });

    // Create Ghost UI element
    const ghostUI = document.createElement("div");
    ghostUI.className = "boongai-ghost-ui";

    // Add content
    if (type === "processing") {
      ghostUI.innerHTML = `
        <div class="boongai-spinner"></div>
        <span class="boongai-message">${this.escapeHtml(content)}</span>
      `;
    } else if (type === "error") {
      ghostUI.innerHTML = `
        <span class="boongai-error-icon">⚠️</span>
        <span class="boongai-message">${this.escapeHtml(content)}</span>
        ${onRetry ? '<button class="boongai-retry-btn">Retry</button>' : ""}
      `;
    } else if (type === "success") {
      ghostUI.innerHTML = `
        <span class="boongai-success-icon">✅</span>
        <div class="boongai-response-content">${this.escapeHtml(content)}</div>
        ${onAccept ? '<button class="boongai-accept-btn">Sử dụng câu trả lời này</button>' : ""}
      `;
    }

    // Add styles
    const style = document.createElement("style");
    style.textContent = this.getStyles(type);

    // Append to shadow root
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(ghostUI);

    // Wire up retry button if provided
    if (onRetry) {
      const retryBtn = shadowRoot.querySelector(".boongai-retry-btn");
      if (retryBtn) {
        retryBtn.addEventListener("click", () => {
          this.remove(commentId);
          onRetry();
        });
      }
    }

    // Wire up accept button if provided
    if (onAccept) {
      const acceptBtn = shadowRoot.querySelector(".boongai-accept-btn");
      if (acceptBtn) {
        acceptBtn.addEventListener("click", () => {
          this.remove(commentId);
          onAccept();
        });
      }
    }

    // Insert below comment
    if (commentElement.parentNode) {
      commentElement.parentNode.insertBefore(
        container,
        commentElement.nextSibling,
      );
      this.domElements.set(commentId, container);
    }
  }

  private static findCommentElement(commentId: string): HTMLElement | null {
    // Try multiple strategies to find the comment element

    // Strategy 1: Find by data attribute (escape special characters for CSS selector)
    try {
      const escapedId = CSS.escape(commentId);
      let element = document.querySelector(
        `[data-comment-id="${escapedId}"]`,
      ) as HTMLElement | null;
      if (element) return element;
    } catch (e) {
      // If CSS.escape fails or selector is invalid, continue to next strategy
    }

    // Strategy 2: Find by aria-label or other Facebook-specific attributes
    try {
      const escapedId = CSS.escape(commentId);
      let element = document.querySelector(
        `[aria-label*="${escapedId}"]`,
      ) as HTMLElement | null;
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
      if (comment.getAttribute("data-boongai-comment-id") === commentId) {
        return comment as HTMLElement;
      }
    }

    return null;
  }

  private static getStyles(type: "processing" | "error" | "success"): string {
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

    if (type === "processing") {
      return (
        baseStyles +
        `
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
      `
      );
    } else if (type === "error") {
      return (
        baseStyles +
        `
        .boongai-ghost-ui {
          background: #fee;
          color: #c33;
          border: 1px solid #fcc;
        }

        .boongai-retry-btn {
          flex-shrink: 0;
          padding: 2px 10px;
          background: #c33;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          font-family: inherit;
        }

        .boongai-retry-btn:hover {
          background: #a00;
        }
      `
      );
    } else {
      return (
        baseStyles +
        `
        .boongai-ghost-ui {
          background: #e8f5e9;
          color: #2e7d32;
          border: 1px solid #a5d6a7;
          flex-direction: column;
          align-items: flex-start;
        }

        .boongai-success-icon {
          font-size: 16px;
          flex-shrink: 0;
        }

        .boongai-response-content {
          flex: 1;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 300px;
          overflow-y: auto;
          padding: 4px 0;
          width: 100%;
        }

        .boongai-accept-btn {
          flex-shrink: 0;
          padding: 6px 16px;
          background: #2e7d32;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 500;
          margin-top: 8px;
        }

        .boongai-accept-btn:hover {
          background: #1b5e20;
        }
      `
      );
    }
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
