import { AutoInjector } from '../autoInjector';
import * as fc from 'fast-check';

describe('AutoInjector Property-Based Tests', () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
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
        { numRuns: 100 }
      );
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
        { numRuns: 50 } // Reduced runs due to async operations
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
        { numRuns: 100 }
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
            submitButton.addEventListener('click', () => {
              submitTriggered = true;
            });

            // Action: Submit reply
            await AutoInjector.submitReply(inputField);

            // Verify: Submit should be triggered
            expect(submitTriggered).toBe(true);

            // Cleanup
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 50 } // Reduced runs due to async operations
      );
    }, 10000); // Increased timeout for async property tests
  });

  describe('Property 28: Ghost UI removal on successful reply', () => {
    it('Feature: boongai-facebook-assistant, **Validates: Requirements 10.7**', async () => {
      // Note: This property test validates the integration with GhostUIManager
      // The actual Ghost UI removal is handled by the content script orchestration
      // Here we test that generateReply returns true on success, which triggers removal
      
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (commentId, aiResponse) => {
            // Setup: Create complete mock environment
            const commentElement = document.createElement('div');
            commentElement.setAttribute('role', 'article');
            commentElement.setAttribute('data-boongai-comment-id', commentId);
            
            const replyButton = document.createElement('div');
            replyButton.setAttribute('role', 'button');
            replyButton.setAttribute('aria-label', 'Reply');
            
            commentElement.appendChild(replyButton);
            document.body.appendChild(commentElement);

            // Mock reply button click to add input field
            replyButton.addEventListener('click', () => {
              const inputField = document.createElement('div');
              inputField.setAttribute('contenteditable', 'true');
              inputField.setAttribute('role', 'textbox');
              commentElement.appendChild(inputField);
            });

            // Mock submit button
            const submitButton = document.createElement('button');
            submitButton.setAttribute('type', 'submit');
            commentElement.appendChild(submitButton);

            // Action: Generate reply
            const success = await AutoInjector.generateReply(commentId, aiResponse);

            // Verify: Should return true on success (which triggers Ghost UI removal)
            expect(success).toBe(true);

            // Cleanup
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 20 } // Reduced runs due to complexity
      );
    }, 15000); // Increased timeout for complex async operations
  });

  describe('Property 38: Line break preservation in replies', () => {
    it('Feature: boongai-facebook-assistant, **Validates: Requirements 15.2**', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 }),
          (lines) => {
            // Create AI response with line breaks
            const aiResponse = lines.join('\n');

            // Action: Format reply
            const formattedReply = AutoInjector.formatReply(aiResponse);

            // Verify: Line breaks should be preserved
            const lineCount = (formattedReply.match(/\n/g) || []).length;
            expect(lineCount).toBeGreaterThanOrEqual(lines.length - 1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 39: Long response truncation', () => {
    it('Feature: boongai-facebook-assistant, **Validates: Requirements 15.3**', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 8001, maxLength: 10000 }).filter(s => s.trim().length > 100), // Filter out mostly whitespace strings
          (longResponse) => {
            // Action: Format reply
            const formattedReply = AutoInjector.formatReply(longResponse);

            // Verify: Should be truncated
            expect(formattedReply.length).toBeLessThanOrEqual(8100); // Prefix + 8000 + suffix

            // Verify: Should contain truncation message
            expect(formattedReply).toContain('... (nội dung đã được rút gọn)');
          }
        ),
        { numRuns: 20 } // Reduced runs due to large strings
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
        { numRuns: 100 }
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
        { numRuns: 100 }
      );
    });
  });
});
