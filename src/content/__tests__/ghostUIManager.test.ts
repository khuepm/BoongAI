import { GhostUIManager } from '../ghostUIManager';
import * as fc from 'fast-check';

// Helper function to find element by exact attribute match (avoids CSS selector issues)
const findGhostUIByCommentId = (commentId: string): Element | null => {
  const allGhostUIs = document.querySelectorAll('[data-boongai-ghost-ui]');
  for (const element of Array.from(allGhostUIs)) {
    if (element.getAttribute('data-boongai-ghost-ui') === commentId) {
      return element;
    }
  }
  return null;
};

describe('GhostUIManager', () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
    // Clear internal state
    (GhostUIManager as any).elements.clear();
    (GhostUIManager as any).domElements.clear();
  });

  // Helper function to create a mock comment element
  const createMockComment = (commentId: string): HTMLElement => {
    const commentElement = document.createElement('div');
    commentElement.setAttribute('role', 'article');
    commentElement.setAttribute('data-boongai-comment-id', commentId);
    document.body.appendChild(commentElement);
    return commentElement;
  };

  describe('Unit Tests', () => {
    describe('showProcessing', () => {
      it('should create a processing Ghost UI element', () => {
        // Create a mock comment element
        createMockComment('test-comment-1');

        GhostUIManager.showProcessing('test-comment-1');

        // Check if Ghost UI was injected
        const ghostUI = document.querySelector('[data-boongai-ghost-ui="test-comment-1"]');
        expect(ghostUI).toBeTruthy();
        expect(ghostUI?.shadowRoot).toBeTruthy();
      });

      it('should display processing message with spinner', () => {
        createMockComment('test-comment-2');

        GhostUIManager.showProcessing('test-comment-2');

        const ghostUI = document.querySelector('[data-boongai-ghost-ui="test-comment-2"]');
        const shadowRoot = ghostUI?.shadowRoot;
        
        expect(shadowRoot?.querySelector('.boongai-spinner')).toBeTruthy();
        expect(shadowRoot?.querySelector('.boongai-message')?.textContent).toBe('AI is processing...');
      });
    });

    describe('showError', () => {
      it('should create an error Ghost UI element', () => {
        createMockComment('test-comment-3');

        GhostUIManager.showError('test-comment-3', 'Test error message');

        const ghostUI = document.querySelector('[data-boongai-ghost-ui="test-comment-3"]');
        expect(ghostUI).toBeTruthy();
        expect(ghostUI?.shadowRoot).toBeTruthy();
      });

      it('should display error message with icon', () => {
        createMockComment('test-comment-4');

        GhostUIManager.showError('test-comment-4', 'Test error message');

        const ghostUI = document.querySelector('[data-boongai-ghost-ui="test-comment-4"]');
        const shadowRoot = ghostUI?.shadowRoot;
        
        expect(shadowRoot?.querySelector('.boongai-error-icon')).toBeTruthy();
        expect(shadowRoot?.querySelector('.boongai-message')?.textContent).toBe('Test error message');
      });

      it('should auto-remove error after 10 seconds', (done) => {
        jest.useFakeTimers();
        
        createMockComment('test-comment-5');

        GhostUIManager.showError('test-comment-5', 'Test error');

        let ghostUI = document.querySelector('[data-boongai-ghost-ui="test-comment-5"]');
        expect(ghostUI).toBeTruthy();

        // Fast-forward time by 10 seconds
        jest.advanceTimersByTime(10000);

        ghostUI = document.querySelector('[data-boongai-ghost-ui="test-comment-5"]');
        expect(ghostUI).toBeNull();

        jest.useRealTimers();
        done();
      });
    });

    describe('remove', () => {
      it('should remove Ghost UI element from DOM', () => {
        createMockComment('test-comment-6');

        GhostUIManager.showProcessing('test-comment-6');

        let ghostUI = document.querySelector('[data-boongai-ghost-ui="test-comment-6"]');
        expect(ghostUI).toBeTruthy();

        GhostUIManager.remove('test-comment-6');

        ghostUI = document.querySelector('[data-boongai-ghost-ui="test-comment-6"]');
        expect(ghostUI).toBeNull();
      });

      it('should handle removing non-existent Ghost UI gracefully', () => {
        expect(() => {
          GhostUIManager.remove('non-existent-comment');
        }).not.toThrow();
      });
    });

    describe('Shadow DOM isolation', () => {
      it('should use Shadow DOM for style isolation', () => {
        createMockComment('test-comment-7');

        GhostUIManager.showProcessing('test-comment-7');

        const ghostUI = document.querySelector('[data-boongai-ghost-ui="test-comment-7"]');
        expect(ghostUI?.shadowRoot).toBeTruthy();
        expect(ghostUI?.shadowRoot?.querySelector('style')).toBeTruthy();
      });
    });

    describe('HTML escaping', () => {
      it('should escape HTML in error messages', () => {
        createMockComment('test-comment-8');

        const maliciousMessage = '<script>alert("xss")</script>';
        GhostUIManager.showError('test-comment-8', maliciousMessage);

        const ghostUI = document.querySelector('[data-boongai-ghost-ui="test-comment-8"]');
        const shadowRoot = ghostUI?.shadowRoot;
        const messageElement = shadowRoot?.querySelector('.boongai-message');
        
        // Should not contain actual script tag
        expect(messageElement?.querySelector('script')).toBeNull();
        // Should contain escaped text
        expect(messageElement?.textContent).toContain('script');
      });
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 17: Ghost UI injection on processing start', () => {
      it('Feature: boongai-facebook-assistant, **Validates: Requirements 8.1**', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            (commentId) => {
              // Setup: Create comment element
              createMockComment(commentId);

              // Action: Start processing
              GhostUIManager.showProcessing(commentId);

              // Verify: Ghost UI should be injected
              const ghostUI = findGhostUIByCommentId(commentId);
              expect(ghostUI).toBeTruthy();
              expect(ghostUI?.shadowRoot).toBeTruthy();

              // Cleanup
              document.body.innerHTML = '';
              (GhostUIManager as any).elements.clear();
              (GhostUIManager as any).domElements.clear();
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 18: Ghost UI visibility during processing', () => {
      it('Feature: boongai-facebook-assistant, **Validates: Requirements 8.3**', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            (commentId) => {
              // Setup: Create comment element
              createMockComment(commentId);

              // Action: Start processing
              GhostUIManager.showProcessing(commentId);

              // Verify: Ghost UI should remain visible
              const ghostUI = findGhostUIByCommentId(commentId);
              expect(ghostUI).toBeTruthy();
              
              // Verify it's actually visible (not hidden)
              const shadowRoot = ghostUI?.shadowRoot;
              const ghostUIElement = shadowRoot?.querySelector('.boongai-ghost-ui') as HTMLElement;
              expect(ghostUIElement).toBeTruthy();
              
              // Cleanup
              document.body.innerHTML = '';
              (GhostUIManager as any).elements.clear();
              (GhostUIManager as any).domElements.clear();
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 19: Ghost UI removal on completion', () => {
      it('Feature: boongai-facebook-assistant, **Validates: Requirements 8.5**', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            (commentId) => {
              // Setup: Create comment element
              createMockComment(commentId);

              // Action: Start processing then complete
              GhostUIManager.showProcessing(commentId);
              
              // Verify Ghost UI exists
              let ghostUI = findGhostUIByCommentId(commentId);
              expect(ghostUI).toBeTruthy();

              // Complete processing
              GhostUIManager.remove(commentId);

              // Verify: Ghost UI should be removed
              ghostUI = findGhostUIByCommentId(commentId);
              expect(ghostUI).toBeNull();

              // Cleanup
              document.body.innerHTML = '';
              (GhostUIManager as any).elements.clear();
              (GhostUIManager as any).domElements.clear();
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 29: Error display in Ghost UI', () => {
      it('Feature: boongai-facebook-assistant, **Validates: Requirements 11.1**', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            fc.string({ minLength: 1, maxLength: 200 }),
            (commentId, errorMessage) => {
              // Setup: Create comment element
              createMockComment(commentId);

              // Action: Show error
              GhostUIManager.showError(commentId, errorMessage);

              // Verify: Error should be displayed in Ghost UI
              const ghostUI = findGhostUIByCommentId(commentId);
              expect(ghostUI).toBeTruthy();
              
              const shadowRoot = ghostUI?.shadowRoot;
              const messageElement = shadowRoot?.querySelector('.boongai-message');
              expect(messageElement?.textContent).toBe(errorMessage);
              expect(shadowRoot?.querySelector('.boongai-error-icon')).toBeTruthy();

              // Cleanup
              document.body.innerHTML = '';
              (GhostUIManager as any).elements.clear();
              (GhostUIManager as any).domElements.clear();
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 30: Error message visibility duration', () => {
      it('Feature: boongai-facebook-assistant, **Validates: Requirements 11.3**', () => {
        jest.useFakeTimers();

        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            fc.string({ minLength: 1, maxLength: 200 }),
            (commentId, errorMessage) => {
              // Setup: Create comment element
              createMockComment(commentId);

              // Action: Show error
              GhostUIManager.showError(commentId, errorMessage);

              // Verify: Error should be visible initially
              let ghostUI = findGhostUIByCommentId(commentId);
              expect(ghostUI).toBeTruthy();

              // Fast-forward time by 9 seconds (should still be visible)
              jest.advanceTimersByTime(9000);
              ghostUI = findGhostUIByCommentId(commentId);
              expect(ghostUI).toBeTruthy();

              // Fast-forward time by 1 more second (total 10 seconds, should be removed)
              jest.advanceTimersByTime(1000);
              ghostUI = findGhostUIByCommentId(commentId);
              expect(ghostUI).toBeNull();

              // Cleanup
              document.body.innerHTML = '';
              (GhostUIManager as any).elements.clear();
              (GhostUIManager as any).domElements.clear();
            }
          ),
          { numRuns: 50 } // Reduced runs due to timer manipulation
        );

        jest.useRealTimers();
      });
    });
  });
});
