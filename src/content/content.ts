/**
 * Content Script - Main Orchestrator
 *
 * Coordinates all content-script modules:
 *   - DOMObserver: mention detection & comment submission capture
 *   - ContextScraper: post content extraction
 *   - GhostUIManager: processing/error UI
 *   - AutoInjector: reply generation & submission
 *
 * Communicates with the background service worker for AI requests
 * and configuration changes.
 */

import { AIResponseMessage, AIRequestMessage, ExtensionConfig } from "@/types";
import { DOMObserver, CommentData } from "./domObserver";
import { ContextScraper } from "./contextScraper";
import { GhostUIManager } from "./ghostUIManager";
import { AutoInjector } from "./autoInjector";
import { ErrorHandler } from "@/utils/errorHandler";

/** Track whether the extension is currently enabled */
let isEnabled = false;

/** Store pending AI requests keyed by commentId for retry support */
const pendingRequests = new Map<
  string,
  { userRequest: string; postContent: string }
>();

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Bootstrap the content script: load config, wire up listeners, and
 * activate monitoring if the master switch is on.
 */
function initialize(): void {
  console.log("[BoongAI] Content Script injected into Facebook");

  // Remove any Ghost UI elements left over from a previous extension context
  document
    .querySelectorAll("[data-boongai-ghost-ui]")
    .forEach((el) => el.remove());

  // Load persisted config and check master switch
  chrome.storage.local.get(["masterSwitch"], (result) => {
    console.log("[BoongAI] Master switch value:", result.masterSwitch);

    // Enable by default if masterSwitch is not explicitly set to false
    if (result.masterSwitch !== false) {
      enableExtension();
    } else {
      console.log("[BoongAI] Extension disabled by master switch");
    }
  });

  // Listen for config changes pushed from popup / background
  chrome.storage.onChanged.addListener(handleStorageChange);

  // Listen for messages from the background service worker
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
}

// ---------------------------------------------------------------------------
// Enable / Disable
// ---------------------------------------------------------------------------

/**
 * Activate all monitoring and processing features.
 * Initialises the DOMObserver with callbacks that drive the end-to-end flow.
 */
function enableExtension(): void {
  if (isEnabled) return;
  isEnabled = true;
  console.log("[BoongAI] Extension enabled");

  DOMObserver.initialize({
    onMentionDetected: (_inputElement: HTMLElement) => {
      // Highlighting is handled internally by DOMObserver.
      // This callback is a hook for future analytics / logging.
    },
    onCommentSubmitted: (commentData: CommentData) => {
      handleCommentSubmission(commentData);
    },
  });
}

/**
 * Deactivate all monitoring and processing features.
 * Cleans up observers and event listeners so the extension is fully inert.
 */
function disableExtension(): void {
  if (!isEnabled) return;
  isEnabled = false;
  console.log("[BoongAI] Extension disabled");

  DOMObserver.cleanup();
}

// ---------------------------------------------------------------------------
// Storage change listener (master switch handling)
// ---------------------------------------------------------------------------

function handleStorageChange(
  changes: { [key: string]: chrome.storage.StorageChange },
  namespace: string,
): void {
  if (namespace !== "local") return;

  if (changes.masterSwitch) {
    if (changes.masterSwitch.newValue) {
      enableExtension();
    } else {
      disableExtension();
    }
  }
}

// ---------------------------------------------------------------------------
// Background message listener
// ---------------------------------------------------------------------------

function handleBackgroundMessage(
  message: any,
  _sender: chrome.runtime.MessageSender,
  _sendResponse: (response?: any) => void,
): void {
  if (message.type === "AI_RESPONSE") {
    handleAIResponse(message as AIResponseMessage);
  }
}

// ---------------------------------------------------------------------------
// End-to-end workflow orchestration
// ---------------------------------------------------------------------------

/**
 * Triggered when the DOMObserver detects a submitted comment containing
 * the @BoongAI mention trigger.
 *
 * Flow:
 *  1. Parse user request from the command comment
 *  2. Extract parent post content via ContextScraper
 *  3. Show processing indicator (Ghost UI)
 *  4. Send AI request to background service worker
 */
async function handleCommentSubmission(
  commentData: CommentData,
): Promise<void> {
  const { commentId, commentText, postId, element } = commentData;

  console.log("[BoongAI] Comment submission detected:", {
    commentId,
    commentText,
    postId,
  });

  // Guard: only process comments that contain the trigger
  if (!/@BoongAI\b/i.test(commentText)) {
    console.log(
      "[BoongAI] Comment does not contain @BoongAI trigger, skipping",
    );
    return;
  }

  console.log("[BoongAI] @BoongAI trigger detected, processing...");

  // Guard: prevent duplicate processing
  if (!ErrorHandler.canProceed(commentId)) {
    console.log("[BoongAI] Comment already being processed, skipping");
    return;
  }

  try {
    // 1. Parse the user request (text after @BoongAI)
    const userRequest = ContextScraper.parseUserRequest(commentText);
    if (!userRequest) {
      console.warn("[BoongAI] No user request found after @BoongAI mention");
      ErrorHandler.completeOperation(commentId);
      return;
    }

    console.log("[BoongAI] User request parsed:", userRequest);

    // 2. Extract post content - pass comment element for better post detection
    console.log("[BoongAI] Extracting post content...");
    const postContent = await ContextScraper.extractPostContent(
      postId,
      element,
    );
    if (!postContent.content) {
      console.error("[BoongAI] Could not extract post content");
      GhostUIManager.showError(
        commentId,
        "Could not extract post content. Please try again.",
      );
      ErrorHandler.completeOperation(commentId);
      return;
    }

    console.log(
      "[BoongAI] Post content extracted:",
      postContent.content.substring(0, 100) + "...",
    );

    // 3. Package request and store for potential retry
    const requestPackage = ContextScraper.packageRequest(
      userRequest,
      postContent,
    );
    pendingRequests.set(commentId, {
      userRequest: requestPackage.userRequest,
      postContent: requestPackage.postContent,
    });

    // 4. Show processing indicator with timeout safety net
    GhostUIManager.showProcessing(commentId, 60000, (id) => {
      GhostUIManager.showError(id, "Request timed out. Please try again.", () =>
        retryAIRequest(id),
      );
    });
    console.log("[BoongAI] Processing indicator shown");

    // 5. Send AI request to background
    sendAIRequestMessage(
      commentId,
      requestPackage.userRequest,
      requestPackage.postContent,
    );
  } catch (error) {
    console.error("[BoongAI] Error in comment submission handler:", error);
    GhostUIManager.showError(
      commentId,
      "An unexpected error occurred. Please try again.",
      () => retryAIRequest(commentId),
    );
    ErrorHandler.completeOperation(commentId);
  }
}

function sendAIRequestMessage(
  commentId: string,
  userRequest: string,
  postContent: string,
): void {
  const aiRequest: AIRequestMessage = {
    type: "AI_REQUEST",
    userRequest,
    postContent,
    commentId,
  };
  console.log("[BoongAI] Sending AI request to background script...");
  chrome.runtime.sendMessage(aiRequest);
}

function retryAIRequest(commentId: string): void {
  const pending = pendingRequests.get(commentId);
  if (!pending) {
    console.warn("[BoongAI] No pending request found for retry:", commentId);
    return;
  }
  console.log("[BoongAI] Retrying AI request for comment:", commentId);
  GhostUIManager.showProcessing(commentId, 60000, (id) => {
    GhostUIManager.showError(id, "Request timed out. Please try again.", () =>
      retryAIRequest(id),
    );
  });
  sendAIRequestMessage(commentId, pending.userRequest, pending.postContent);
}

/**
 * Handles the AI_RESPONSE message coming back from the background worker.
 *
 * On success  → trigger auto-reply via AutoInjector, then remove Ghost UI.
 * On failure  → display error in Ghost UI.
 */
async function handleAIResponse(message: AIResponseMessage): Promise<void> {
  const { commentId, response, success, error } = message;

  console.log("[BoongAI Content] ========== AI RESPONSE RECEIVED ==========");
  console.log("[BoongAI Content] Comment ID:", commentId);
  console.log("[BoongAI Content] Success:", success);
  console.log(
    "[BoongAI Content] Response:",
    response ? response.substring(0, 200) + "..." : "null",
  );
  console.log("[BoongAI Content] Error:", error);

  try {
    if (!success || !response) {
      // Display the error in Ghost UI with retry button
      const errorMsg =
        error?.message || "AI processing failed. Please try again.";
      console.log(
        "[BoongAI Content] ❌ AI request failed, showing error:",
        errorMsg,
      );
      GhostUIManager.remove(commentId); // remove processing indicator first
      GhostUIManager.showError(commentId, errorMsg, () =>
        retryAIRequest(commentId),
      );
      return;
    }

    console.log(
      "[BoongAI Content] ✅ AI response successful, generating reply...",
    );
    // Attempt to generate and post the auto-reply
    const replySuccess = await AutoInjector.generateReply(commentId, response);

    if (replySuccess) {
      console.log(
        "[BoongAI Content] ✅ Reply posted successfully, removing Ghost UI",
      );
      GhostUIManager.remove(commentId);
      pendingRequests.delete(commentId);
    } else {
      console.log("[BoongAI Content] ❌ Reply injection failed");
      GhostUIManager.remove(commentId);
      GhostUIManager.showError(
        commentId,
        "Could not post reply. Please try manually.",
      );
      pendingRequests.delete(commentId);
    }
  } catch (err) {
    console.error("[BoongAI Content] ❌ Error handling AI response:", err);
    GhostUIManager.remove(commentId);
    GhostUIManager.showError(
      commentId,
      "Could not post reply. Please try manually.",
    );
    pendingRequests.delete(commentId);
  } finally {
    ErrorHandler.completeOperation(commentId);
    console.log(
      "[BoongAI Content] ========== AI RESPONSE HANDLING COMPLETE ==========",
    );
  }
}

// ---------------------------------------------------------------------------
// Exported helpers (for testing)
// ---------------------------------------------------------------------------

export {
  initialize,
  enableExtension,
  disableExtension,
  handleCommentSubmission,
  handleAIResponse,
  retryAIRequest,
  isEnabled,
};

export function _getIsEnabled(): boolean {
  return isEnabled;
}

export function _resetState(): void {
  isEnabled = false;
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

initialize();
