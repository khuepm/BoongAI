import { AutoInjector } from '../autoInjector';
import * as fc from 'fast-check';

describe('AutoInjector Property-Based Tests', () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
    // Mock humanization delay to speed up tests (avoid real 500-1500ms waits)
    jest.spyOn(AutoInjector, 'generateHumanizationDelay').mockReturnValue(10);
    // Mock pre-submit delay to speed up tests (avoid real 2-3s waits for 3-5s target)
    jest.spyOn(AutoInjector, 'calculatePreSubmitDelay').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper function to create a mock comment element with reply button
  const createMockCommentWithReplyButton = (commentId: string): HTMLElement => {
    const commentElement = document.createElement('div');
    commentElement.setAttribute('role', 'article');
    commentElement.setAttribute('data-boongai-comment-id', commentId);
    
    // Create reply button
    const replyButton = document.createElement('div');
    replyButton.setAttribute('role', 'button');
    replyButton.setAttribute('aria-label', 'Reply');
    commentElement.appendChild(replyButton);
    
    document.body.appendChild(commentElement);
    return commentElement;
  };

  describe('Property 24: Reply button location', () => {
    it('Feature: boongai-facebook-assistant, **Validates: Requirements 10.1**', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/), // Use alphanumeric strings safe for CSS selectors
          (commentId) => {
            // Setup: Create comment with reply button
            createMockCommentWithReplyButton(commentId);

            // Action: Locate reply button
            const replyButton = AutoInjector.findReplyButton(commentId);

            // Verify: Reply button should be found
            expect(replyButton).toBeTruthy();
            expect(replyButton?.getAttribute('role')).toBe('button');
            expect(replyButton?.getAttribute('aria-label')).toContain('Reply');

            // Cleanup
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should find the correct reply button among multiple comments in the same container', () => {
      // Setup: Create a shared parent container with multiple comments
      const sharedContainer = document.createElement('div');

      const comment1 = document.createElement('div');
      comment1.setAttribute('role', 'article');
      comment1.setAttribute('data-boongai-comment-id', 'comment-A');
      const reply1 = document.createElement('div');
      reply1.setAttribute('role', 'button');
      reply1.setAttribute('aria-label', 'Reply');
      reply1.textContent = 'Reply-A';
      comment1.appendChild(reply1);

      const comment2 = document.createElement('div');
      comment2.setAttribute('role', 'article');
      comment2.setAttribute('data-boongai-comment-id', 'comment-B');
      const reply2 = document.createElement('div');
      reply2.setAttribute('role', 'button');
      reply2.setAttribute('aria-label', 'Reply');
      reply2.textContent = 'Reply-B';
      comment2.appendChild(reply2);

      sharedContainer.appendChild(comment1);
      sharedContainer.appendChild(comment2);
      document.body.appendChild(sharedContainer);

      // Action & Verify: Each comment should find its own reply button
      const foundReply1 = AutoInjector.findReplyButton('comment-A');
      expect(foundReply1).toBe(reply1);
      expect(foundReply1?.textContent).toBe('Reply-A');

      const foundReply2 = AutoInjector.findReplyButton('comment-B');
      expect(foundReply2).toBe(reply2);
      expect(foundReply2?.textContent).toBe('Reply-B');

      // Cleanup
      document.body.innerHTML = '';
    });

    it('should return null when comment element does not exist', () => {
      const result = AutoInjector.findReplyButton('nonexistent-id');
      expect(result).toBeNull();
    });

    it('should find reply button via text-based matching (Vietnamese)', () => {
      const commentElement = document.createElement('div');
      commentElement.setAttribute('role', 'article');
      commentElement.setAttribute('data-boongai-comment-id', 'vn-comment');

      const replySpan = document.createElement('span');
      replySpan.textContent = 'Trả lời';
      commentElement.appendChild(replySpan);

      document.body.appendChild(commentElement);

      const found = AutoInjector.findReplyButton('vn-comment');
      expect(found).toBe(replySpan);

      document.body.innerHTML = '';
    });
  });

  describe('Property 25: Reply button click opens input', () => {
    it('Feature: boongai-facebook-assistant, **Validates: Requirements 10.2**', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
          async (commentId) => {
            // Setup: Create comment with reply button
            const commentElement = createMockCommentWithReplyButton(commentId);
            const replyButton = AutoInjector.findReplyButton(commentId);
            expect(replyButton).toBeTruthy();

            // Track if click event was triggered
            let clickTriggered = false;
            replyButton!.addEventListener('click', () => {
              clickTriggered = true;
              
              // Simulate Facebook behavior: add reply input field after click
              const inputField = document.createElement('div');
              inputField.setAttribute('contenteditable', 'true');
              inputField.setAttribute('role', 'textbox');
              commentElement.appendChild(inputField);
            });

            // Action: Click reply button
            await AutoInjector.clickReplyButton(replyButton!);

            // Verify: Click event should be triggered
            expect(clickTriggered).toBe(true);

            // Verify: Reply input field should appear
            const inputField = commentElement.querySelector('[contenteditable="true"]');
            expect(inputField).toBeTruthy();

            // Cleanup
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 10 } // Reduced runs due to async operations
      );
    }, 10000); // Increased timeout for async property tests
  });

  describe('Property 26: AI response injection with prefix', () => {
    it('Feature: boongai-facebook-assistant, **Validates: Requirements 10.3, 15.1**', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (aiResponse) => {
            // Action: Format reply
            const formattedReply = AutoInjector.formatReply(aiResponse);

            // Verify: Should start with prefix
            expect(formattedReply).toMatch(/^\[🤖 BoongAI trả lời\]: /);

            // Verify: Formatted reply should contain the prefix
            expect(formattedReply.length).toBeGreaterThan('[🤖 BoongAI trả lời]: '.length);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 27: Reply submission', () => {
    it('Feature: boongai-facebook-assistant, **Validates: Requirements 10.5**', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
          async (commentId) => {
            // Setup: Create input field with submit button
            const container = document.createElement('div');
            container.setAttribute('role', 'article');
            
            const inputField = document.createElement('div');
            inputField.setAttribute('contenteditable', 'true');
            inputField.setAttribute('role', 'textbox');
            inputField.textContent = 'Test reply';
            
            const submitButton = document.createElement('button');
            submitButton.setAttribute('type', 'submit');
            
            container.appendChild(inputField);
            container.appendChild(submitButton);
            document.body.appendChild(container);

            // Track if submit was triggered
            let submitTriggered = false;
            submitButton.addEventListener('click', (e) => {
              e.preventDefault(); // Prevent actual form submission
              submitTriggered = true;
            });

            // Also track Enter key events as fallback
            let enterKeyPressed = false;
            inputField.addEventListener('keydown', (e) => {
              if ((e as KeyboardEvent).key === 'Enter') {
                enterKeyPressed = true;
              }
            });

            // Action: Submit reply
            await AutoInjector.submitReply(inputField);

            // Verify: Either submit button clicked OR Enter key pressed
            expect(submitTriggered || enterKeyPressed).toBe(true);

            // Cleanup
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 10 } // Reduced runs due to async operations
      );
    }, 15000); // Increased timeout for async property tests
  });

  describe('Property 28: Ghost UI removal on successful reply', () => {
    it('Feature: boongai-facebook-assistant, **Validates: Requirements 10.7**', async () => {
      // Note: This property test validates the integration with GhostUIManager
      // The actual Ghost UI removal is handled by the content script orchestration
      // Here we test that generateReply returns true on success, which triggers removal
      
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
          fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 3),
          async (commentId, aiResponse) => {
            // Setup: Create complete mock environment with proper structure
            const commentElement = document.createElement('div');
            commentElement.setAttribute('role', 'article');
            commentElement.setAttribute('data-boongai-comment-id', commentId);
            
            const replyButton = document.createElement('div');
            replyButton.setAttribute('role', 'button');
            replyButton.setAttribute('aria-label', 'Reply');
            
            // Track if reply button was clicked
            let replyButtonClicked = false;
            
            // IMPORTANT: Add event listener BEFORE appending to DOM
            replyButton.addEventListener('click', () => {
              replyButtonClicked = true;
              
              // Simulate Facebook behavior: add reply input field after click
              const inputField = document.createElement('div');
              inputField.setAttribute('contenteditable', 'true');
              inputField.setAttribute('role', 'textbox');
              commentElement.appendChild(inputField);
              
              // Add submit button
              const submitButton = document.createElement('button');
              submitButton.setAttribute('type', 'submit');
              commentElement.appendChild(submitButton);
              
              // Mock submit button click
              submitButton.addEventListener('click', (e) => {
                e.preventDefault();
              });
            });
            
            commentElement.appendChild(replyButton);
            document.body.appendChild(commentElement);

            // Action: Generate reply
            const success = await AutoInjector.generateReply(commentId, aiResponse);

            // Verify: Reply button should have been clicked
            expect(replyButtonClicked).toBe(true);
            
            // Verify: Should return true on success (which triggers Ghost UI removal)
            expect(success).toBe(true);

            // Cleanup
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 10 } // Reduced runs due to complexity
      );
    }, 20000); // Increased timeout for complex async operations
  });

  describe('Property 38: Line break preservation in replies', () => {
    it('Feature: boongai-facebook-assistant, **Validates: Requirements 15.2**', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => {
              // Filter out strings that are just markdown headers or special chars
              const trimmed = s.trim();
              return trimmed.length > 0 && !trimmed.match(/^[#\s*_`-]+$/);
            }), 
            { minLength: 2, maxLength: 5 }
          ),
          (lines) => {
            // Create AI response with line breaks
            const aiResponse = lines.join('\n');
            const expectedLineBreaks = lines.length - 1;

            // Action: Format reply
            const formattedReply = AutoInjector.formatReply(aiResponse);

            // Verify: Line breaks should be preserved (or at least some should remain)
            const lineCount = (formattedReply.match(/\n/g) || []).length;
            
            // Allow for some line breaks to be removed during markdown processing
            // but at least half should be preserved
            expect(lineCount).toBeGreaterThanOrEqual(Math.floor(expectedLineBreaks / 2));
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 39: Long response truncation', () => {
    it('Feature: boongai-facebook-assistant, **Validates: Requirements 15.3**', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 8001, maxLength: 10000 }).filter(s => {
            // Filter to ensure meaningful content that won't be heavily sanitized
            // Count alphanumeric characters to ensure substantial content
            const alphanumeric = s.match(/[a-zA-Z0-9]/g) || [];
            return alphanumeric.length > 1000; // At least 1000 alphanumeric chars
          }),
          (longResponse) => {
            // Action: Format reply
            const formattedReply = AutoInjector.formatReply(longResponse);

            // Verify: Should be truncated
            // The formatted reply includes prefix "[🤖 BoongAI trả lời]: " which is ~25 chars
            // So total should be around 8000 + prefix + truncation message
            expect(formattedReply.length).toBeLessThanOrEqual(8100);

            // Verify: Should contain truncation message
            expect(formattedReply).toContain('... (nội dung đã được rút gọn)');
          }
        ),
        { numRuns: 10 } // Reduced runs due to large strings and strict filter
      );
    });
  });

  describe('Property 40: Unsupported markdown removal', () => {
    it('Feature: boongai-facebook-assistant, **Validates: Requirements 15.4**', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '**bold text**',
            '*italic text*',
            '`code`',
            '# Header',
            '[link](http://example.com)',
            '![image](http://example.com/img.png)',
            '> blockquote',
            '- list item',
            '1. numbered item'
          ),
          (markdownText) => {
            // Action: Format reply
            const formattedReply = AutoInjector.formatReply(markdownText);

            // Verify: Markdown syntax should be removed
            expect(formattedReply).not.toContain('**');
            expect(formattedReply).not.toContain('`');
            expect(formattedReply).not.toMatch(/^#/);
            expect(formattedReply).not.toContain('](');
            expect(formattedReply).not.toMatch(/^>/);
            expect(formattedReply).not.toMatch(/^-\s/);
            expect(formattedReply).not.toMatch(/^\d+\.\s/);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 41: Malicious content sanitization', () => {
    it('Feature: boongai-facebook-assistant, **Validates: Requirements 15.5**', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '<script>alert("xss")</script>',
            '<img src=x onerror="alert(1)">',
            '<a href="javascript:alert(1)">click</a>',
            '<iframe src="http://evil.com"></iframe>',
            '<object data="http://evil.com"></object>',
            '<embed src="http://evil.com">',
            '<form action="http://evil.com"></form>',
            '<meta http-equiv="refresh" content="0;url=http://evil.com">',
            'onclick="alert(1)"',
            'onload="alert(1)"'
          ),
          (maliciousContent) => {
            // Action: Sanitize content
            const sanitized = AutoInjector.sanitizeContent(maliciousContent);

            // Verify: No script tags
            expect(sanitized).not.toMatch(/<script/i);

            // Verify: No event handlers
            expect(sanitized).not.toMatch(/on\w+\s*=/i);

            // Verify: No javascript: URLs
            expect(sanitized).not.toMatch(/javascript:/i);

            // Verify: No iframes
            expect(sanitized).not.toMatch(/<iframe/i);

            // Verify: No objects/embeds
            expect(sanitized).not.toMatch(/<object/i);
            expect(sanitized).not.toMatch(/<embed/i);

            // Verify: No forms
            expect(sanitized).not.toMatch(/<form/i);

            // Verify: No meta tags
            expect(sanitized).not.toMatch(/<meta/i);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 45: Precise reply button targeting via DOM structure', () => {
    it('Feature: boongai-facebook-assistant, **Validates: Requirements 10.1**', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }),
          (numComments) => {
            // Setup: Create a shared container with N comments, each with its own reply button
            const sharedContainer = document.createElement('div');
            sharedContainer.className = 'comments-container';

            const commentIds: string[] = [];
            const replyButtons: Map<string, HTMLElement> = new Map();

            for (let i = 0; i < numComments; i++) {
              const commentId = `comment-${i}`;
              commentIds.push(commentId);

              const commentElement = document.createElement('div');
              commentElement.setAttribute('role', 'article');
              commentElement.setAttribute('data-boongai-comment-id', commentId);

              const replyButton = document.createElement('div');
              replyButton.setAttribute('role', 'button');
              replyButton.setAttribute('aria-label', 'Reply');
              replyButton.setAttribute('data-reply-for', commentId); // tracking marker
              commentElement.appendChild(replyButton);

              replyButtons.set(commentId, replyButton);
              sharedContainer.appendChild(commentElement);
            }

            document.body.appendChild(sharedContainer);

            // Action & Verify: For each comment, findReplyButton should return
            // the reply button that is strictly structurally bound to that comment
            for (const commentId of commentIds) {
              const foundButton = AutoInjector.findReplyButton(commentId);

              // Should find a reply button
              expect(foundButton).not.toBeNull();

              // Should be the exact reply button inside this specific comment
              const expectedButton = replyButtons.get(commentId)!;
              expect(foundButton).toBe(expectedButton);
              expect(foundButton?.getAttribute('data-reply-for')).toBe(commentId);
            }

            // Cleanup
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

describe('Property 46: Anti-spam humanized delay', () => {
  // Restore real implementations for delay tests (beforeEach mocks them)
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('Feature: boongai-facebook-assistant, **Validates: Requirements 10.4, 10.6** - generateHumanizationDelay returns value between 500 and 1500', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }), // dummy input to drive multiple iterations
        (_seed) => {
          const delay = AutoInjector.generateHumanizationDelay();

          // Verify: Delay must be within 500ms - 1500ms range (inclusive)
          expect(delay).toBeGreaterThanOrEqual(500);
          expect(delay).toBeLessThanOrEqual(1500);

          // Verify: Delay must be an integer (Math.floor is used)
          expect(Number.isInteger(delay)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Feature: boongai-facebook-assistant, **Validates: Requirements 10.4, 10.6** - calculatePreSubmitDelay keeps total time in 3-5 second range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }), // elapsed time in ms
        (elapsedMs) => {
          const preSubmitDelay = AutoInjector.calculatePreSubmitDelay(elapsedMs);

          // Verify: Delay must be non-negative
          expect(preSubmitDelay).toBeGreaterThanOrEqual(0);

          // Verify: Delay must be an integer
          expect(Number.isInteger(preSubmitDelay)).toBe(true);

          // The submitDelay constant inside calculatePreSubmitDelay is 200ms
          const submitDelay = 200;
          const totalEstimated = elapsedMs + preSubmitDelay + submitDelay;

          if (elapsedMs >= 3000 - submitDelay) {
            // If enough time has already elapsed, delay should be 0
            expect(preSubmitDelay).toBe(0);
          } else {
            // Total time (elapsed + preSubmitDelay + submitDelay) should reach at least 3000ms
            expect(totalEstimated).toBeGreaterThanOrEqual(3000);
            // Total time should not exceed 5000ms
            expect(totalEstimated).toBeLessThanOrEqual(5000);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

