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

import { AIResponseMessage, AIRequestMessage, ExtensionConfig } from '@/types';
import { DOMObserver, CommentData } from './domObserver';
import { ContextScraper } from './contextScraper';
import { GhostUIManager } from './ghostUIManager';
import { AutoInjector } from './autoInjector';
import { ErrorHandler } from '@/utils/errorHandler';

/** Track whether the extension is currently enabled */
let isEnabled = false;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Bootstrap the content script: load config, wire up listeners, and
 * activate monitoring if the master switch is on.
 */
function initialize(): void {
  console.log('[BoongAI] Content Script injected into Facebook');

  // Load persisted config and check master switch
  chrome.storage.local.get(['masterSwitch'], (result) => {
    console.log('[BoongAI] Master switch value:', result.masterSwitch);
    
    // Enable by default if masterSwitch is not explicitly set to false
    if (result.masterSwitch !== false) {
      enableExtension();
    } else {
      console.log('[BoongAI] Extension disabled by master switch');
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
  console.log('[BoongAI] Extension enabled');

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
  console.log('[BoongAI] Extension disabled');

  DOMObserver.cleanup();
}

// ---------------------------------------------------------------------------
// Storage change listener (master switch handling)
// ---------------------------------------------------------------------------

function handleStorageChange(
  changes: { [key: string]: chrome.storage.StorageChange },
  namespace: string,
): void {
  if (namespace !== 'local') return;

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
  if (message.type === 'AI_RESPONSE') {
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
async function handleCommentSubmission(commentData: CommentData): Promise<void> {
  const { commentId, commentText, postId } = commentData;

  console.log('[BoongAI] Comment submission detected:', { commentId, commentText, postId });

  // Guard: only process comments that contain the trigger
  if (!/@BoongAI\b/i.test(commentText)) {
    console.log('[BoongAI] Comment does not contain @BoongAI trigger, skipping');
    return;
  }

  console.log('[BoongAI] @BoongAI trigger detected, processing...');

  // Guard: prevent duplicate processing
  if (!ErrorHandler.canProceed(commentId)) {
    console.log('[BoongAI] Comment already being processed, skipping');
    return;
  }

  try {
    // 1. Parse the user request (text after @BoongAI)
    const userRequest = ContextScraper.parseUserRequest(commentText);
    if (!userRequest) {
      console.warn('[BoongAI] No user request found after @BoongAI mention');
      ErrorHandler.completeOperation(commentId);
      return;
    }

    console.log('[BoongAI] User request parsed:', userRequest);

    // 2. Extract post content
    console.log('[BoongAI] Extracting post content...');
    const postContent = await ContextScraper.extractPostContent(postId);
    if (!postContent.content) {
      console.error('[BoongAI] Could not extract post content');
      GhostUIManager.showError(commentId, 'Could not extract post content. Please try again.');
      ErrorHandler.completeOperation(commentId);
      return;
    }

    console.log('[BoongAI] Post content extracted:', postContent.content.substring(0, 100) + '...');

    // 3. Show processing indicator
    GhostUIManager.showProcessing(commentId);
    console.log('[BoongAI] Processing indicator shown');

    // 4. Package and send AI request to background
    const requestPackage = ContextScraper.packageRequest(userRequest, postContent);

    const aiRequest: AIRequestMessage = {
      type: 'AI_REQUEST',
      userRequest: requestPackage.userRequest,
      postContent: requestPackage.postContent,
      commentId,
    };

    console.log('[BoongAI] Sending AI request to background script...');
    chrome.runtime.sendMessage(aiRequest);
  } catch (error) {
    console.error('[BoongAI] Error in comment submission handler:', error);
    GhostUIManager.showError(commentId, 'An unexpected error occurred. Please try again.');
    ErrorHandler.completeOperation(commentId);
  }
}

/**
 * Handles the AI_RESPONSE message coming back from the background worker.
 *
 * On success  → trigger auto-reply via AutoInjector, then remove Ghost UI.
 * On failure  → display error in Ghost UI.
 */
async function handleAIResponse(message: AIResponseMessage): Promise<void> {
  const { commentId, response, success, error } = message;

  try {
    if (!success || !response) {
      // Display the error in Ghost UI
      const errorMsg = error?.message || 'AI processing failed. Please try again.';
      GhostUIManager.remove(commentId); // remove processing indicator first
      GhostUIManager.showError(commentId, errorMsg);
      return;
    }

    // Attempt to generate and post the auto-reply
    const replySuccess = await AutoInjector.generateReply(commentId, response);

    if (replySuccess) {
      // Reply posted – remove Ghost UI
      GhostUIManager.remove(commentId);
    } else {
      // Reply injection failed
      GhostUIManager.remove(commentId);
      GhostUIManager.showError(commentId, 'Could not post reply. Please try manually.');
    }
  } catch (err) {
    console.error('[BoongAI] Error handling AI response:', err);
    GhostUIManager.remove(commentId);
    GhostUIManager.showError(commentId, 'Could not post reply. Please try manually.');
  } finally {
    ErrorHandler.completeOperation(commentId);
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
