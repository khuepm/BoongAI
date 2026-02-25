// Error Handler Utility
import { ExtensionError, ErrorContext, ERROR_MESSAGES } from '@/types';

/**
 * ErrorHandler provides centralized error handling, logging, and recovery strategies
 * for the BoongAI Facebook Assistant extension.
 * 
 * Responsibilities:
 * - Log errors to browser console with structured format
 * - Display user-friendly error messages
 * - Attempt automatic recovery for recoverable errors
 * - Schedule retries with exponential backoff
 */
export class ErrorHandler {
  /**
   * Handle an error by logging it, displaying user message, and attempting recovery
   * 
   * @param error - The extension error to handle
   * @param context - Context information about where the error occurred
   */
  static handle(error: ExtensionError, context: ErrorContext): void {
    // Log to console with structured format
    console.error('[BoongAI]', {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp,
      context: context
    });

    // Display user-friendly message in Ghost UI if commentId is available
    if (context.commentId) {
      // Note: Ghost UI Manager will be integrated in Task 7
      // For now, we just prepare the error message
      const userMessage = ERROR_MESSAGES[error.code];
      
      // In production, this would call:
      // GhostUIManager.showError(context.commentId, userMessage);
      
      // For testing purposes, we'll store the message in context
      context.additionalData = context.additionalData || {};
      context.additionalData.displayedMessage = userMessage;
    }

    // Update UI state based on error type
    if (error.code === 'API_AUTH_FAILED') {
      // Note: API Validator will be integrated in Task 3
      // For now, we just log the state change
      console.warn('[BoongAI] Connection indicator should be updated to red');
    }

    // Attempt recovery
    this.attemptRecovery(error, context);
  }

  /**
   * Attempt to recover from an error using error-specific recovery strategies
   * 
   * @param error - The extension error to recover from
   * @param context - Context information for recovery
   */
  static attemptRecovery(error: ExtensionError, context: ErrorContext): void {
    switch (error.code) {
      case 'INVALID_CONFIG':
        // Reset to default configuration
        console.info('[BoongAI] Attempting recovery: Resetting to default configuration');
        // Note: Configuration Manager will be integrated in Task 2
        // ConfigurationManager.resetToDefaults();
        break;

      case 'API_TIMEOUT':
      case 'NETWORK_ERROR':
        // Retry with exponential backoff if retry count is below limit
        if (context.retryCount < 2) {
          console.info(`[BoongAI] Attempting recovery: Scheduling retry ${context.retryCount + 1}/2`);
          this.scheduleRetry(context, error);
        } else {
          console.warn('[BoongAI] Max retry attempts reached, giving up');
        }
        break;

      case 'API_RATE_LIMIT':
        // Log rate limit but don't retry automatically
        console.warn('[BoongAI] Rate limit hit, user must wait before retrying');
        break;

      case 'CONTEXT_EXTRACTION_FAILED':
      case 'REPLY_INJECTION_FAILED':
      case 'DOM_NOT_FOUND':
        // DOM-related errors - suggest page refresh
        console.warn('[BoongAI] DOM error occurred, user should refresh the page');
        break;

      case 'API_AUTH_FAILED':
        // Authentication error - user must update API key
        console.warn('[BoongAI] Authentication failed, user must update API key');
        break;

      default:
        console.warn('[BoongAI] No recovery strategy available for error code:', error.code);
    }
  }

  /**
   * Schedule a retry of the failed operation with exponential backoff
   * 
   * @param context - Context information including retry count
   * @param error - The error that triggered the retry
   */
  static scheduleRetry(context: ErrorContext, error: ExtensionError): void {
    // Calculate delay using exponential backoff: 2^retryCount seconds
    const delay = Math.pow(2, context.retryCount) * 1000;
    
    console.info(`[BoongAI] Scheduling retry in ${delay}ms`);
    
    setTimeout(() => {
      context.retryCount++;
      console.info(`[BoongAI] Executing retry attempt ${context.retryCount}`);
      
      // Note: The actual retry logic will be implemented by the calling module
      // This method just handles the scheduling and backoff calculation
      // The caller should check context.retryCount and re-execute the operation
      
      // Store retry information in context for the caller
      context.additionalData = context.additionalData || {};
      context.additionalData.lastRetryTime = Date.now();
      context.additionalData.retryDelay = delay;
    }, delay);
  }

  /**
   * Create a new ExtensionError with the current timestamp
   * 
   * @param code - The error code
   * @param message - The error message
   * @param details - Optional additional details
   * @param context - Optional context data
   * @returns A new ExtensionError object
   */
  static createError(
    code: ExtensionError['code'],
    message: string,
    details?: string,
    context?: Record<string, any>
  ): ExtensionError {
    return {
      code,
      message,
      details,
      timestamp: Date.now(),
      context
    };
  }

  /**
   * Handle concurrent operation conflicts by queuing requests
   * This prevents multiple AI requests from being processed simultaneously
   * 
   * @param operationId - Unique identifier for the operation
   * @returns true if operation can proceed, false if it should be queued
   */
  private static activeOperations = new Set<string>();
  private static operationQueue: Array<{ id: string; callback: () => void }> = [];

  static canProceed(operationId: string): boolean {
    if (this.activeOperations.has(operationId)) {
      console.warn(`[BoongAI] Operation ${operationId} is already in progress`);
      return false;
    }
    
    this.activeOperations.add(operationId);
    return true;
  }

  static completeOperation(operationId: string): void {
    this.activeOperations.delete(operationId);
    
    // Process next queued operation if any
    if (this.operationQueue.length > 0) {
      const next = this.operationQueue.shift();
      if (next) {
        console.info(`[BoongAI] Processing queued operation ${next.id}`);
        next.callback();
      }
    }
  }

  static queueOperation(operationId: string, callback: () => void): void {
    console.info(`[BoongAI] Queueing operation ${operationId}`);
    this.operationQueue.push({ id: operationId, callback });
  }
}
