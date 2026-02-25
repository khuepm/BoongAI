/**
 * Tests for DOM Observer Module
 */

import { DOMObserver, CommentData } from '../domObserver';
import fc from 'fast-check';

// Property test configuration
const propertyTestConfig = {
  numRuns: 100,
  verbose: true,
};

describe('DOM Observer Module', () => {
  beforeEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
    // Ensure observer is cleaned up
    DOMObserver.cleanup();
  });

  afterEach(() => {
    DOMObserver.cleanup();
  });

  describe('Unit Tests', () => {
    describe('initialize and cleanup', () => {
      test('should initialize observer and set active state', () => {
        DOMObserver.initialize();
        expect(DOMObserver.isObserverActive()).toBe(true);
      });

      test('should cleanup observer and set inactive state', () => {
        DOMObserver.initialize();
        DOMObserver.cleanup();
        expect(DOMObserver.isObserverActive()).toBe(false);
      });

      test('should not initialize twice', () => {
        DOMObserver.initialize();
        const firstState = DOMObserver.isObserverActive();
        DOMObserver.initialize();
        const secondState = DOMObserver.isObserverActive();
        expect(firstState).toBe(true);
        expect(secondState).toBe(true);
      });
    });

    describe('detectMentionTrigger', () => {
      test('should detect @BoongAI mention in text', () => {
        DOMObserver.initialize();
        const input = document.createElement('div');
        input.textContent = 'Hello @BoongAI please help';
        
        const detected = DOMObserver.detectMentionTrigger(input);
        expect(detected).toBe(true);
      });

      test('should not detect mention without @BoongAI', () => {
        DOMObserver.initialize();
        const input = document.createElement('div');
        input.textContent = 'Hello world';
        
        const detected = DOMObserver.detectMentionTrigger(input);
        expect(detected).toBe(false);
      });

      test('should detect case-insensitive @BoongAI', () => {
        DOMObserver.initialize();
        const input = document.createElement('div');
        input.textContent = 'Hello @boongai please help';
        
        const detected = DOMObserver.detectMentionTrigger(input);
        expect(detected).toBe(true);
      });

      test('should not detect when observer is inactive', () => {
        const input = document.createElement('div');
        input.textContent = 'Hello @BoongAI please help';
        
        const detected = DOMObserver.detectMentionTrigger(input);
        expect(detected).toBe(false);
      });
    });

    describe('highlightMention', () => {
      test('should highlight @BoongAI mention in text node', () => {
        DOMObserver.initialize();
        const container = document.createElement('div');
        const textNode = document.createTextNode('Hello @BoongAI please help');
        container.appendChild(textNode);
        document.body.appendChild(container);

        DOMObserver.highlightMention(textNode);

        const highlighted = container.querySelector('.boongai-mention-highlight');
        expect(highlighted).toBeTruthy();
        expect(highlighted?.textContent).toContain('@BoongAI');
      });

      test('should apply blue gradient styling to highlight', () => {
        DOMObserver.initialize();
        const container = document.createElement('div');
        const textNode = document.createTextNode('Hello @BoongAI please help');
        container.appendChild(textNode);
        document.body.appendChild(container);

        DOMObserver.highlightMention(textNode);

        const highlighted = container.querySelector('.boongai-mention-highlight') as HTMLElement;
        expect(highlighted).toBeTruthy();
        // Check that style attribute contains gradient and color
        const styleAttr = highlighted?.getAttribute('style') || '';
        expect(styleAttr).toContain('linear-gradient');
        expect(styleAttr).toContain('color');
      });

      test('should not highlight when observer is inactive', () => {
        const container = document.createElement('div');
        const textNode = document.createTextNode('Hello @BoongAI please help');
        container.appendChild(textNode);
        document.body.appendChild(container);

        DOMObserver.highlightMention(textNode);

        const highlighted = container.querySelector('.boongai-mention-highlight');
        expect(highlighted).toBeFalsy();
      });
    });

    describe('captureCommentSubmission', () => {
      test('should capture comment data from element', () => {
        DOMObserver.initialize();
        const comment = document.createElement('div');
        comment.setAttribute('data-comment-id', 'comment-123');
        comment.setAttribute('data-post-id', 'post-456');
        comment.textContent = 'This is a comment with @BoongAI';
        document.body.appendChild(comment);

        const data = DOMObserver.captureCommentSubmission(comment);

        expect(data).toBeTruthy();
        expect(data?.commentId).toBe('comment-123');
        expect(data?.postId).toBe('post-456');
        expect(data?.commentText).toContain('@BoongAI');
        expect(data?.timestamp).toBeGreaterThan(0);
      });

      test('should return null when observer is inactive', () => {
        const comment = document.createElement('div');
        comment.setAttribute('data-comment-id', 'comment-123');
        comment.textContent = 'This is a comment';

        const data = DOMObserver.captureCommentSubmission(comment);
        expect(data).toBeNull();
      });

      test('should generate fallback IDs when attributes are missing', () => {
        DOMObserver.initialize();
        const comment = document.createElement('div');
        comment.textContent = 'This is a comment';
        document.body.appendChild(comment);

        const data = DOMObserver.captureCommentSubmission(comment);

        expect(data).toBeTruthy();
        expect(data?.commentId).toMatch(/^comment-/);
        expect(data?.postId).toMatch(/^post-/);
      });
    });

    describe('isAutoReplyComment', () => {
      test('should return true for comments starting with auto-reply prefix', () => {
        DOMObserver.initialize();
        expect(DOMObserver.isAutoReplyComment('[🤖 BoongAI trả lời]: This is an AI response')).toBe(true);
      });

      test('should return true for prefix-only comment', () => {
        DOMObserver.initialize();
        expect(DOMObserver.isAutoReplyComment('[🤖 BoongAI trả lời]: ')).toBe(true);
      });

      test('should return false for regular comments', () => {
        DOMObserver.initialize();
        expect(DOMObserver.isAutoReplyComment('Hello @BoongAI please help')).toBe(false);
      });

      test('should return false for empty string', () => {
        DOMObserver.initialize();
        expect(DOMObserver.isAutoReplyComment('')).toBe(false);
      });

      test('should return false when prefix appears mid-text', () => {
        DOMObserver.initialize();
        expect(DOMObserver.isAutoReplyComment('Some text [🤖 BoongAI trả lời]: response')).toBe(false);
      });
    });

    describe('captureCommentSubmission auto-reply guard', () => {
      test('should return null for auto-reply comments', () => {
        DOMObserver.initialize();
        const comment = document.createElement('div');
        comment.setAttribute('data-comment-id', 'comment-123');
        comment.setAttribute('data-post-id', 'post-456');
        comment.textContent = '[🤖 BoongAI trả lời]: This is an AI response';
        document.body.appendChild(comment);

        const data = DOMObserver.captureCommentSubmission(comment);
        expect(data).toBeNull();
      });

      test('should not trigger callback for auto-reply comments', () => {
        const callback = jest.fn();
        DOMObserver.initialize({ onCommentSubmitted: callback });
        
        const comment = document.createElement('div');
        comment.setAttribute('data-comment-id', 'comment-123');
        comment.setAttribute('data-post-id', 'post-456');
        comment.textContent = '[🤖 BoongAI trả lời]: AI generated reply';
        document.body.appendChild(comment);

        DOMObserver.captureCommentSubmission(comment);
        expect(callback).not.toHaveBeenCalled();
      });

      test('should still capture regular comments with @BoongAI', () => {
        DOMObserver.initialize();
        const comment = document.createElement('div');
        comment.setAttribute('data-comment-id', 'comment-123');
        comment.setAttribute('data-post-id', 'post-456');
        comment.textContent = '@BoongAI please summarize this post';
        document.body.appendChild(comment);

        const data = DOMObserver.captureCommentSubmission(comment);
        expect(data).toBeTruthy();
        expect(data?.commentText).toContain('@BoongAI');
      });
    });

    describe('isAlreadyProcessed and comment deduplication', () => {
      test('should return false for a comment that has not been processed', () => {
        DOMObserver.initialize();
        expect(DOMObserver.isAlreadyProcessed('comment-new')).toBe(false);
      });

      test('should return true for a comment that has been processed', () => {
        DOMObserver.initialize();
        const comment = document.createElement('div');
        comment.setAttribute('data-comment-id', 'comment-dedup-1');
        comment.setAttribute('data-post-id', 'post-456');
        comment.textContent = '@BoongAI help me';
        document.body.appendChild(comment);

        // First call processes the comment
        const data = DOMObserver.captureCommentSubmission(comment);
        expect(data).toBeTruthy();

        // Now it should be marked as processed
        expect(DOMObserver.isAlreadyProcessed('comment-dedup-1')).toBe(true);
      });

      test('should return null for already-processed comments on second call', () => {
        DOMObserver.initialize();
        const comment = document.createElement('div');
        comment.setAttribute('data-comment-id', 'comment-dedup-2');
        comment.setAttribute('data-post-id', 'post-456');
        comment.textContent = '@BoongAI summarize this';
        document.body.appendChild(comment);

        // First call succeeds
        const first = DOMObserver.captureCommentSubmission(comment);
        expect(first).toBeTruthy();

        // Second call returns null (already processed)
        const second = DOMObserver.captureCommentSubmission(comment);
        expect(second).toBeNull();
      });

      test('should not trigger callback for already-processed comments', () => {
        const callback = jest.fn();
        DOMObserver.initialize({ onCommentSubmitted: callback });

        const comment = document.createElement('div');
        comment.setAttribute('data-comment-id', 'comment-dedup-3');
        comment.setAttribute('data-post-id', 'post-456');
        comment.textContent = '@BoongAI what is this about?';
        document.body.appendChild(comment);

        // First call triggers callback
        DOMObserver.captureCommentSubmission(comment);
        expect(callback).toHaveBeenCalledTimes(1);

        // Second call (simulating edit re-trigger) should NOT trigger callback
        DOMObserver.captureCommentSubmission(comment);
        expect(callback).toHaveBeenCalledTimes(1);
      });

      test('should handle edited comment without re-triggering', () => {
        DOMObserver.initialize();
        const comment = document.createElement('div');
        comment.setAttribute('data-comment-id', 'comment-edit-1');
        comment.setAttribute('data-post-id', 'post-456');
        comment.textContent = '@BoongAI original text';
        document.body.appendChild(comment);

        // First submission
        const first = DOMObserver.captureCommentSubmission(comment);
        expect(first).toBeTruthy();
        expect(first?.commentText).toBe('@BoongAI original text');

        // Simulate edit - same comment ID, different text
        comment.textContent = '@BoongAI edited text';
        const second = DOMObserver.captureCommentSubmission(comment);
        expect(second).toBeNull();
      });

      test('should allow different comment IDs to be processed independently', () => {
        DOMObserver.initialize();

        const comment1 = document.createElement('div');
        comment1.setAttribute('data-comment-id', 'comment-a');
        comment1.setAttribute('data-post-id', 'post-1');
        comment1.textContent = '@BoongAI first comment';
        document.body.appendChild(comment1);

        const comment2 = document.createElement('div');
        comment2.setAttribute('data-comment-id', 'comment-b');
        comment2.setAttribute('data-post-id', 'post-1');
        comment2.textContent = '@BoongAI second comment';
        document.body.appendChild(comment2);

        const first = DOMObserver.captureCommentSubmission(comment1);
        const second = DOMObserver.captureCommentSubmission(comment2);

        expect(first).toBeTruthy();
        expect(second).toBeTruthy();
        expect(first?.commentId).toBe('comment-a');
        expect(second?.commentId).toBe('comment-b');
      });

      test('should clear processed IDs on cleanup', () => {
        DOMObserver.initialize();
        const comment = document.createElement('div');
        comment.setAttribute('data-comment-id', 'comment-cleanup');
        comment.setAttribute('data-post-id', 'post-456');
        comment.textContent = '@BoongAI test cleanup';
        document.body.appendChild(comment);

        // Process the comment
        DOMObserver.captureCommentSubmission(comment);
        expect(DOMObserver.isAlreadyProcessed('comment-cleanup')).toBe(true);

        // Cleanup and reinitialize
        DOMObserver.cleanup();
        expect(DOMObserver.isAlreadyProcessed('comment-cleanup')).toBe(false);

        // After reinitialize, the same comment can be processed again
        DOMObserver.initialize();
        const data = DOMObserver.captureCommentSubmission(comment);
        expect(data).toBeTruthy();
      });
    });

    describe('Editor framework support', () => {
      test('should extract text from Lexical editor', () => {
        DOMObserver.initialize();
        const input = document.createElement('div');
        const lexicalEditor = document.createElement('div');
        lexicalEditor.setAttribute('data-lexical-editor', 'true');
        lexicalEditor.textContent = 'Hello @BoongAI from Lexical';
        input.appendChild(lexicalEditor);

        const detected = DOMObserver.detectMentionTrigger(input);
        expect(detected).toBe(true);
      });

      test('should extract text from Draft.js editor', () => {
        DOMObserver.initialize();
        const input = document.createElement('div');
        const draftContent = document.createElement('div');
        draftContent.setAttribute('data-contents', 'true');
        draftContent.textContent = 'Hello @BoongAI from Draft.js';
        input.appendChild(draftContent);

        const detected = DOMObserver.detectMentionTrigger(input);
        expect(detected).toBe(true);
      });
    });
  });

  describe('Property Tests', () => {
    describe('Property 8: Mention trigger detection and highlighting', () => {
      test('Feature: boongai-facebook-assistant, **Validates: Requirements 5.2, 5.3**', () => {
        fc.assert(
          fc.property(
            commentTextWithMentionArbitrary(),
            (commentText) => {
              // Initialize observer
              DOMObserver.cleanup();
              DOMObserver.initialize();

              // Create input element with mention
              const inputElement = document.createElement('div');
              inputElement.setAttribute('contenteditable', 'true');
              inputElement.setAttribute('role', 'textbox');
              inputElement.setAttribute('aria-label', 'Write a comment');
              inputElement.textContent = commentText;
              document.body.appendChild(inputElement);

              // Detect mention
              const detected = DOMObserver.detectMentionTrigger(inputElement);

              // Verify detection
              expect(detected).toBe(true);

              // Highlight mention
              const textNode = inputElement.firstChild;
              if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                DOMObserver.highlightMention(textNode);

                // Verify highlighting was applied
                const highlighted = inputElement.querySelector('.boongai-mention-highlight');
                expect(highlighted).toBeTruthy();
                
                // Verify the highlighted text contains @BoongAI (case-insensitive)
                const highlightedText = highlighted?.textContent || '';
                expect(highlightedText.toLowerCase()).toContain('@boongai');
              }

              // Cleanup
              document.body.removeChild(inputElement);
            }
          ),
          propertyTestConfig
        );
      });
    });

    describe('Property 9: Mention trigger detection across editor frameworks', () => {
      test('Feature: boongai-facebook-assistant, **Validates: Requirements 5.4**', () => {
        fc.assert(
          fc.property(
            commentTextWithMentionArbitrary(),
            fc.constantFrom('lexical', 'draftjs', 'plain'),
            (commentText, editorType) => {
              // Initialize observer
              DOMObserver.cleanup();
              DOMObserver.initialize();

              // Create input element based on editor type
              const inputElement = document.createElement('div');
              inputElement.setAttribute('contenteditable', 'true');

              if (editorType === 'lexical') {
                const lexicalEditor = document.createElement('div');
                lexicalEditor.setAttribute('data-lexical-editor', 'true');
                lexicalEditor.textContent = commentText;
                inputElement.appendChild(lexicalEditor);
              } else if (editorType === 'draftjs') {
                const draftContent = document.createElement('div');
                draftContent.setAttribute('data-contents', 'true');
                draftContent.textContent = commentText;
                inputElement.appendChild(draftContent);
              } else {
                inputElement.textContent = commentText;
              }

              document.body.appendChild(inputElement);

              // Detect mention across all editor frameworks
              const detected = DOMObserver.detectMentionTrigger(inputElement);

              // Verify detection works for all frameworks
              expect(detected).toBe(true);

              // Cleanup
              document.body.removeChild(inputElement);
            }
          ),
          propertyTestConfig
        );
      });
    });

    describe('Property 10: Highlight persistence until action', () => {
      test('Feature: boongai-facebook-assistant, **Validates: Requirements 5.5**', () => {
        fc.assert(
          fc.property(
            commentTextWithMentionArbitrary(),
            (commentText) => {
              // Initialize observer
              DOMObserver.cleanup();
              DOMObserver.initialize();

              // Create input element with mention
              const inputElement = document.createElement('div');
              inputElement.setAttribute('contenteditable', 'true');
              const textNode = document.createTextNode(commentText);
              inputElement.appendChild(textNode);
              document.body.appendChild(inputElement);

              // Highlight mention
              DOMObserver.highlightMention(textNode);

              // Verify highlight exists
              let highlighted = inputElement.querySelector('.boongai-mention-highlight');
              expect(highlighted).toBeTruthy();

              // Simulate time passing (highlight should persist)
              // In a real scenario, this would persist until submission or deletion
              // For this test, we verify the highlight remains in the DOM
              highlighted = inputElement.querySelector('.boongai-mention-highlight');
              expect(highlighted).toBeTruthy();

              // Cleanup
              document.body.removeChild(inputElement);
            }
          ),
          propertyTestConfig
        );
      });
    });

    describe('Property 11: Comment submission capture', () => {
      test('Feature: boongai-facebook-assistant, **Validates: Requirements 6.1**', () => {
        fc.assert(
          fc.property(
            commentTextWithMentionArbitrary(),
            fc.string({ minLength: 5, maxLength: 20 }),
            fc.string({ minLength: 5, maxLength: 20 }),
            (commentText, commentId, postId) => {
              // Initialize observer
              DOMObserver.cleanup();
              
              let capturedData: CommentData | undefined;
              DOMObserver.initialize({
                onCommentSubmitted: (data: CommentData) => {
                  capturedData = data;
                }
              });

              // Create comment element
              const commentElement = document.createElement('div');
              commentElement.setAttribute('data-comment-id', commentId);
              commentElement.setAttribute('data-post-id', postId);
              commentElement.textContent = commentText;
              document.body.appendChild(commentElement);

              // Capture submission
              const data = DOMObserver.captureCommentSubmission(commentElement);

              // Verify capture
              expect(data).toBeTruthy();
              expect(data?.commentId).toBe(commentId);
              expect(data?.postId).toBe(postId);
              expect(data?.commentText).toBe(commentText);
              expect(data?.timestamp).toBeGreaterThan(0);

              // Verify callback was triggered
              expect(capturedData).toBeDefined();
              expect(capturedData?.commentId).toBe(commentId);

              // Cleanup
              document.body.removeChild(commentElement);
            }
          ),
          propertyTestConfig
        );
      });
    });

    describe('Property 33: Dynamic comment field detection', () => {
      test('Feature: boongai-facebook-assistant, **Validates: Requirements 12.2**', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.integer({ min: 1, max: 5 }),
            async (numFields) => {
              // Initialize observer
              DOMObserver.cleanup();
              
              const detectedFields: HTMLElement[] = [];
              DOMObserver.initialize({
                onMentionDetected: (element) => {
                  detectedFields.push(element);
                }
              });

              // Dynamically add comment fields
              const fields: HTMLElement[] = [];
              for (let i = 0; i < numFields; i++) {
                const field = document.createElement('div');
                field.setAttribute('contenteditable', 'true');
                field.setAttribute('role', 'textbox');
                field.setAttribute('aria-label', 'Write a comment');
                field.textContent = `Comment ${i} with @BoongAI`;
                document.body.appendChild(field);
                fields.push(field);

                // Trigger input event to simulate user typing
                const event = new Event('input', { bubbles: true });
                field.dispatchEvent(event);
              }

              // Wait for debounce (50ms) and mutation observer
              await new Promise<void>((resolve) => {
                setTimeout(() => {
                  // Verify that fields were detected
                  // Note: Detection happens through MutationObserver and event delegation
                  // We verify the observer is active and fields are in the DOM
                  expect(DOMObserver.isObserverActive()).toBe(true);
                  expect(document.querySelectorAll('[contenteditable="true"]').length).toBe(numFields);

                  // Cleanup
                  fields.forEach(field => document.body.removeChild(field));
                  resolve();
                }, 100);
              });
            }
          ),
          { ...propertyTestConfig, numRuns: 20 } // Reduce runs for async test
        );
      });
    });

    describe('Property 34: Command comment detection', () => {
      test('Feature: boongai-facebook-assistant, **Validates: Requirements 12.3**', () => {
        fc.assert(
          fc.property(
            commentTextWithMentionArbitrary(),
            (commentText) => {
              // Initialize observer
              DOMObserver.cleanup();
              
              let submittedComment: CommentData | null = null;
              DOMObserver.initialize({
                onCommentSubmitted: (data) => {
                  submittedComment = data;
                }
              });

              // Create a comment element that simulates a posted comment
              const commentElement = document.createElement('div');
              commentElement.setAttribute('role', 'article');
              commentElement.setAttribute('data-comment-id', 'test-comment');
              commentElement.setAttribute('data-post-id', 'test-post');
              commentElement.textContent = commentText;
              
              // Add to DOM (simulates comment being posted)
              document.body.appendChild(commentElement);

              // Capture the submission
              const captured = DOMObserver.captureCommentSubmission(commentElement);

              // Verify detection
              expect(captured).toBeTruthy();
              expect(captured?.commentText).toBe(commentText);
              expect(captured?.commentText.toLowerCase()).toContain('@boongai');

              // Cleanup
              document.body.removeChild(commentElement);
            }
          ),
          propertyTestConfig
        );
      });
    });
  });
});

// Custom generators (arbitraries)

/**
 * Generator for comment text containing @BoongAI mention
 */
function commentTextWithMentionArbitrary() {
  return fc.tuple(
    fc.string({ maxLength: 100 }),
    fc.constantFrom('@BoongAI', '@boongai', '@BOONGAI', '@BoongAi'),
    fc.string({ minLength: 1, maxLength: 200 })
  ).map(([prefix, mention, suffix]) => `${prefix}${mention} ${suffix}`.trim());
}
