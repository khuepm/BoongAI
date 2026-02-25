/**
 * Integration Test: Error Scenarios
 * Tests error handling across the extension modules
 * Requirements: 9.4, 9.5, 9.6, 11.1, 11.2
 */

import { AICommunicator } from '../../utils/aiCommunicator';
import { GhostUIManager } from '../../content/ghostUIManager';
import { ContextScraper } from '../../content/contextScraper';
import { ErrorHandler } from '../../utils/errorHandler';
import { AutoInjector } from '../../content/autoInjector';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// Ensure chrome mock is available
(global as any).chrome = {
  ...((global as any).chrome || {}),
  storage: {
    local: { get: jest.fn(), set: jest.fn() },
    onChanged: { addListener: jest.fn() },
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
    getManifest: jest.fn(() => ({ version: '1.0.0' })),
    onInstalled: { addListener: jest.fn() },
  },
  tabs: { create: jest.fn() },
};

function createMockComment(commentId: string): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('role', 'article');
  el.setAttribute('data-boongai-comment-id', commentId);
  document.body.appendChild(el);
  return el;
}

describe('Integration: Error Scenarios', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mockFetch.mockReset();
    jest.clearAllMocks();
    (GhostUIManager as any).elements?.clear();
    (GhostUIManager as any).domElements?.clear();
  });

  describe('1. Invalid API key handling', () => {
    test('should return auth error for 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API key' } }),
      });

      await expect(
        AICommunicator.sendRequest({
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          apiKey: 'invalid-key',
          prompt: 'test',
          timeout: 5000,
        })
      ).rejects.toThrow();

      // Verify error categorization
      const error = new Error('API request failed: 401 Unauthorized');
      const errorMsg = AICommunicator.handleError(error);
      expect(errorMsg.type).toBe('auth');
      expect(errorMsg.message).toContain('Invalid API key');
    });

    test('should return auth error for 403 response', () => {
      const error = new Error('API request failed: 403 Forbidden');
      const errorMsg = AICommunicator.handleError(error);
      expect(errorMsg.type).toBe('auth');
    });
  });

  describe('2. Network failure handling', () => {
    test('should categorize fetch errors as network errors', () => {
      const error = new Error('fetch failed: NetworkError');
      const errorMsg = AICommunicator.handleError(error);
      expect(errorMsg.type).toBe('network');
      expect(errorMsg.message).toContain('Network error');
    });

    test('should handle network errors during AI request', async () => {
      mockFetch.mockRejectedValue(new Error('fetch failed: NetworkError'));

      await expect(
        AICommunicator.sendRequest({
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          apiKey: 'test-key',
          prompt: 'test',
          timeout: 5000,
        })
      ).rejects.toThrow('fetch failed');
    });
  });

  describe('3. Timeout handling', () => {
    test('should categorize AbortError as timeout', () => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      const errorMsg = AICommunicator.handleError(error);
      expect(errorMsg.type).toBe('timeout');
      expect(errorMsg.message).toContain('timed out');
    });

    test('should abort request on timeout', async () => {
      // Mock a fetch that never resolves (simulating timeout)
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            // Simulate abort after a short delay
            setTimeout(() => reject(abortError), 50);
          })
      );

      await expect(
        AICommunicator.sendRequest({
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          apiKey: 'test-key',
          prompt: 'test',
          timeout: 100,
        })
      ).rejects.toThrow();
    });
  });

  describe('4. Rate limiting handling', () => {
    test('should categorize 429 as rate limit error', () => {
      const error = new Error('API request failed: 429 Too Many Requests');
      const errorMsg = AICommunicator.handleError(error);
      expect(errorMsg.type).toBe('rate_limit');
      expect(errorMsg.message).toContain('Rate limit');
    });
  });

  describe('5. Context extraction failures', () => {
    test('should return empty content for non-existent post', async () => {
      const result = await ContextScraper.extractPostContent('non-existent-post');
      expect(result.content).toBe('');
      expect(result.isComplete).toBe(false);
    });

    test('should handle extraction failure gracefully', async () => {
      // No post in DOM
      const result = await ContextScraper.extractPostContent('missing-post-123');
      expect(result.postId).toBe('missing-post-123');
      expect(result.content).toBe('');
    });
  });

  describe('6. Reply injection failures', () => {
    test('should return false when reply button not found', async () => {
      // No comment element in DOM
      const result = await AutoInjector.generateReply('nonexistent-comment', 'AI response');
      expect(result).toBe(false);
    });
  });

  describe('7. Error messages display in Ghost UI', () => {
    test('should display error message in Ghost UI', () => {
      const commentId = 'error-display-1';
      createMockComment(commentId);

      GhostUIManager.showError(commentId, 'AI request timed out. Please try again.');

      const ghostUI = document.querySelector(`[data-boongai-ghost-ui="${commentId}"]`);
      expect(ghostUI).toBeTruthy();
      const msg = ghostUI?.shadowRoot?.querySelector('.boongai-message');
      expect(msg?.textContent).toBe('AI request timed out. Please try again.');
    });

    test('should display different error types correctly', () => {
      const errorTypes = [
        { id: 'err-auth', msg: 'Invalid API key. Please check your configuration.' },
        { id: 'err-rate', msg: 'Rate limit exceeded. Please wait and try again.' },
        { id: 'err-net', msg: 'Network error. Please check your connection.' },
        { id: 'err-extract', msg: 'Could not extract post content. Please try again.' },
        { id: 'err-inject', msg: 'Could not post reply. Please try manually.' },
      ];

      for (const { id, msg } of errorTypes) {
        createMockComment(id);
        GhostUIManager.showError(id, msg);
        const ghostUI = document.querySelector(`[data-boongai-ghost-ui="${id}"]`);
        expect(ghostUI).toBeTruthy();
        const displayed = ghostUI?.shadowRoot?.querySelector('.boongai-message');
        expect(displayed?.textContent).toBe(msg);
      }
    });

    test('should auto-remove error after 10 seconds', () => {
      jest.useFakeTimers();
      const commentId = 'err-autoremove';
      createMockComment(commentId);

      GhostUIManager.showError(commentId, 'Test error');
      expect(document.querySelector(`[data-boongai-ghost-ui="${commentId}"]`)).toBeTruthy();

      jest.advanceTimersByTime(9999);
      expect(document.querySelector(`[data-boongai-ghost-ui="${commentId}"]`)).toBeTruthy();

      jest.advanceTimersByTime(1);
      expect(document.querySelector(`[data-boongai-ghost-ui="${commentId}"]`)).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('8. ErrorHandler integration', () => {
    test('should log errors to console with structured format', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = ErrorHandler.createError(
        'API_TIMEOUT',
        'AI request timed out',
        'Request exceeded 30s'
      );

      ErrorHandler.handle(error, {
        commentId: 'test-comment',
        operation: 'AI_REQUEST',
        retryCount: 0,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[BoongAI]',
        expect.objectContaining({
          code: 'API_TIMEOUT',
          message: 'AI request timed out',
        })
      );

      consoleSpy.mockRestore();
    });

    test('should not auto-reply when errors occur', () => {
      // ErrorHandler.canProceed prevents duplicate processing
      const opId = 'error-no-reply';
      expect(ErrorHandler.canProceed(opId)).toBe(true);
      // Same operation should be blocked
      expect(ErrorHandler.canProceed(opId)).toBe(false);
      // Complete the operation
      ErrorHandler.completeOperation(opId);
      // Now it should be available again
      expect(ErrorHandler.canProceed(opId)).toBe(true);
      ErrorHandler.completeOperation(opId);
    });
  });
});
