import { ContextScraper } from '../contextScraper';
import * as fc from 'fast-check';
import { PostContent } from '@/types';

describe('ContextScraper', () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
  });

  // Helper function to create a mock post element
  const createMockPost = (postId: string, content: string, hasSeeMore: boolean = false): HTMLElement => {
    if (!document || !document.body) {
      throw new Error('Document not available');
    }
    
    const postElement = document.createElement('div');
    postElement.setAttribute('role', 'article');
    postElement.setAttribute('id', postId);
    postElement.setAttribute('data-post-id', postId);
    
    const contentDiv = document.createElement('div');
    contentDiv.textContent = content;
    postElement.appendChild(contentDiv);

    if (hasSeeMore) {
      const seeMoreButton = document.createElement('div');
      seeMoreButton.setAttribute('role', 'button');
      seeMoreButton.textContent = 'See more';
      postElement.appendChild(seeMoreButton);
    }

    document.body.appendChild(postElement);
    return postElement;
  };

  // Helper function to create a mock post with UI elements
  const createMockPostWithUIElements = (postId: string, content: string): HTMLElement => {
    if (!document || !document.body) {
      throw new Error('Document not available');
    }
    
    const postElement = document.createElement('div');
    postElement.setAttribute('role', 'article');
    postElement.setAttribute('id', postId);
    postElement.setAttribute('data-post-id', postId);
    
    const contentDiv = document.createElement('div');
    contentDiv.textContent = content;
    postElement.appendChild(contentDiv);

    // Add UI elements that should be filtered out
    const likeCount = document.createElement('span');
    likeCount.textContent = '123 Likes';
    postElement.appendChild(likeCount);

    const timestamp = document.createElement('span');
    timestamp.textContent = '2 hours ago';
    postElement.appendChild(timestamp);

    const shareButton = document.createElement('button');
    shareButton.textContent = 'Share';
    postElement.appendChild(shareButton);

    document.body.appendChild(postElement);
    return postElement;
  };

  describe('Unit Tests', () => {
    describe('findPostContainer', () => {
      it('should find post by postId', () => {
        const postId = 'test-post-123';
        createMockPost(postId, 'Test content');

        const found = ContextScraper.findPostContainer(postId);
        expect(found).toBeTruthy();
        expect(found?.getAttribute('data-post-id')).toBe(postId);
      });

      it('should return null for non-existent post', () => {
        const found = ContextScraper.findPostContainer('non-existent-post');
        expect(found).toBeNull();
      });
    });

    describe('extractTextContent', () => {
      it('should extract text content from post element', () => {
        const postElement = document.createElement('div');
        postElement.textContent = 'This is a test post';

        const text = ContextScraper.extractTextContent(postElement);
        expect(text).toContain('This is a test post');
      });

      it('should exclude script and style elements', () => {
        const postElement = document.createElement('div');
        postElement.innerHTML = 'Content<script>alert("xss")</script><style>.test{}</style>';

        const text = ContextScraper.extractTextContent(postElement);
        expect(text).not.toContain('alert');
        expect(text).not.toContain('.test');
      });
    });

    describe('filterUIElements', () => {
      it('should remove like counts', () => {
        const text = 'Great post! 123 Likes 45 Comments';
        const filtered = ContextScraper.filterUIElements(text);
        expect(filtered).not.toContain('123 Likes');
        expect(filtered).not.toContain('45 Comments');
      });

      it('should remove timestamps', () => {
        const text = 'Posted 2 hours ago';
        const filtered = ContextScraper.filterUIElements(text);
        expect(filtered).not.toContain('2 hours ago');
      });

      it('should remove "See more" text', () => {
        const text = 'This is content See more';
        const filtered = ContextScraper.filterUIElements(text);
        expect(filtered).not.toContain('See more');
      });
    });

    describe('parseUserRequest', () => {
      it('should extract text after @BoongAI mention', () => {
        const commentText = '@BoongAI summarize this post';
        const request = ContextScraper.parseUserRequest(commentText);
        expect(request).toBe('summarize this post');
      });

      it('should handle case-insensitive mention', () => {
        const commentText = '@boongai help me understand';
        const request = ContextScraper.parseUserRequest(commentText);
        expect(request).toBe('help me understand');
      });

      it('should return empty string if no mention found', () => {
        const commentText = 'Just a regular comment';
        const request = ContextScraper.parseUserRequest(commentText);
        expect(request).toBe('');
      });
    });

    describe('packageRequest', () => {
      it('should package user request and post content', () => {
        const userRequest = 'summarize this';
        const postContent: PostContent = {
          postId: 'post-123',
          content: 'This is the post content',
          extractedAt: Date.now(),
          isComplete: true
        };

        const packaged = ContextScraper.packageRequest(userRequest, postContent);
        expect(packaged.userRequest).toBe(userRequest);
        expect(packaged.postContent).toBe(postContent.content);
        expect(packaged.postId).toBe(postContent.postId);
      });
    });

    describe('expandSeeMore', () => {
      it('should return true if no "See more" button exists', async () => {
        const postElement = createMockPost('post-1', 'Content', false);
        const result = await ContextScraper.expandSeeMore(postElement);
        expect(result).toBe(true);
      });

      it('should click "See more" button and wait for DOM mutation', async () => {
        const postElement = createMockPost('post-2', 'Content', true);
        const seeMoreButton = postElement.querySelector('[role="button"]') as HTMLElement;
        const clickSpy = jest.spyOn(seeMoreButton, 'click').mockImplementation(() => {
          // Simulate DOM mutation after click (e.g., expanding content)
          const expandedContent = document.createElement('div');
          expandedContent.textContent = 'Expanded content here';
          postElement.appendChild(expandedContent);
        });

        const result = await ContextScraper.expandSeeMore(postElement);
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(result).toBe(true);
      });

      it('should return false if no DOM mutation occurs within timeout', async () => {
        const postElement = createMockPost('post-3', 'Content', true);
        const seeMoreButton = postElement.querySelector('[role="button"]') as HTMLElement;
        // Click does nothing — no DOM mutation will fire
        jest.spyOn(seeMoreButton, 'click').mockImplementation(() => {});

        // Use fake timers to avoid waiting 3 real seconds
        jest.useFakeTimers();
        const resultPromise = ContextScraper.expandSeeMore(postElement);
        jest.advanceTimersByTime(3000);
        const result = await resultPromise;
        jest.useRealTimers();

        expect(result).toBe(false);
      });
    });

    describe('extractPostContent', () => {
      it('should extract complete post content', async () => {
        const postId = 'post-123';
        createMockPost(postId, 'This is a test post');

        const result = await ContextScraper.extractPostContent(postId);
        expect(result.postId).toBe(postId);
        expect(result.content).toContain('This is a test post');
        expect(result.isComplete).toBe(true);
      });

      it('should return empty content for non-existent post', async () => {
        const result = await ContextScraper.extractPostContent('non-existent');
        expect(result.content).toBe('');
        expect(result.isComplete).toBe(false);
      });
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 12: Post content extraction on submission', () => {
      it('Feature: boongai-facebook-assistant, **Validates: Requirements 6.2**', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            async (postId, content) => {
              // Clear DOM before each iteration
              if (document && document.body) {
                document.body.innerHTML = '';
              }

              // Setup: Create a mock post
              createMockPost(postId, content);

              // Action: Extract post content
              const result = await ContextScraper.extractPostContent(postId);

              // Verify: Content should be extracted
              expect(result.postId).toBe(postId);
              expect(result.content).toBeTruthy();
              expect(result.extractedAt).toBeGreaterThan(0);
              expect(typeof result.isComplete).toBe('boolean');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 13: User request parsing', () => {
      it('Feature: boongai-facebook-assistant, **Validates: Requirements 6.4**', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            (userCommand) => {
              // Setup: Create comment text with @BoongAI mention
              const commentText = `@BoongAI ${userCommand}`;

              // Action: Parse user request
              const parsed = ContextScraper.parseUserRequest(commentText);

              // Verify: User command should be extracted (trimmed)
              expect(parsed).toBe(userCommand.trim());
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 14: Request packaging after extraction', () => {
      it('Feature: boongai-facebook-assistant, **Validates: Requirements 6.5**', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 200 }),
            fc.record({
              postId: fc.string({ minLength: 1, maxLength: 50 }),
              content: fc.string({ minLength: 1, maxLength: 500 }),
              extractedAt: fc.nat(),
              isComplete: fc.boolean()
            }),
            (userRequest, postContent) => {
              // Action: Package request
              const packaged = ContextScraper.packageRequest(userRequest, postContent);

              // Verify: All data should be packaged correctly
              expect(packaged.userRequest).toBe(userRequest);
              expect(packaged.postContent).toBe(postContent.content);
              expect(packaged.postId).toBe(postContent.postId);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 15: Text extraction excludes UI elements', () => {
      it('Feature: boongai-facebook-assistant, **Validates: Requirements 7.4**', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            fc.string({ minLength: 10, maxLength: 200 }),
            async (postId, content) => {
              // Clear DOM before each iteration
              if (document && document.body) {
                document.body.innerHTML = '';
              }

              // Setup: Create post with UI elements
              createMockPostWithUIElements(postId, content);

              // Action: Extract text content
              const postElement = ContextScraper.findPostContainer(postId);
              expect(postElement).toBeTruthy();
              
              const rawText = ContextScraper.extractTextContent(postElement!);
              const filtered = ContextScraper.filterUIElements(rawText);

              // Verify: UI elements should be filtered out
              // The filtered text should not contain common UI patterns
              expect(filtered).not.toMatch(/\d+\s*(Like|Likes|Comment|Comments|Share|Shares)/i);
              expect(filtered).not.toMatch(/\d+\s*hours?\s*ago/i);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 16: Extraction failure shows error', () => {
      it('Feature: boongai-facebook-assistant, **Validates: Requirements 7.5**', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            async (postId) => {
              // Clear DOM before each iteration
              if (document && document.body) {
                document.body.innerHTML = '';
              }

              // Setup: No post element created (simulating extraction failure)
              // Action: Attempt to extract content
              const result = await ContextScraper.extractPostContent(postId);

              // Verify: Should return empty content and isComplete = false
              expect(result.postId).toBe(postId);
              expect(result.content).toBe('');
              expect(result.isComplete).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 44: See more DOM mutation wait', () => {
      it('Feature: boongai-facebook-assistant, **Validates: Requirements 7.2**', async () => {
        jest.useRealTimers();

        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
            fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            fc.string({ minLength: 1, maxLength: 300 }).filter(s => s.trim().length > 0),
            fc.integer({ min: 5, max: 100 }),
            async (postId, initialContent, expandedText, mutationDelayMs) => {
              // Clear DOM before each iteration
              if (document && document.body) {
                document.body.innerHTML = '';
              }

              // Setup: Create a post with a "See more" button
              const postElement = createMockPost(postId, initialContent, true);
              const seeMoreButton = postElement.querySelector('[role="button"]') as HTMLElement;
              expect(seeMoreButton).toBeTruthy();

              // Track whether the button was clicked and when mutation fires
              let buttonClicked = false;
              let mutationFired = false;

              // Override click to simulate async DOM mutation after a random delay
              // mutationDelayMs is always well under the 3s timeout, so the observer should catch it
              jest.spyOn(seeMoreButton, 'click').mockImplementation(() => {
                buttonClicked = true;
                setTimeout(() => {
                  const expandedDiv = document.createElement('div');
                  expandedDiv.className = 'expanded-content';
                  expandedDiv.textContent = expandedText;
                  postElement.appendChild(expandedDiv);
                  mutationFired = true;
                }, mutationDelayMs);
              });

              // Action: Call expandSeeMore and wait for it to complete
              const result = await ContextScraper.expandSeeMore(postElement);

              // Verify: The button should have been clicked
              expect(buttonClicked).toBe(true);

              // Verify: expandSeeMore waited for the DOM mutation (delay < 3s timeout)
              expect(mutationFired).toBe(true);
              expect(result).toBe(true);

              // Verify: The expanded text is available in the DOM after expandSeeMore returns
              const expandedDiv = postElement.querySelector('.expanded-content');
              expect(expandedDiv).toBeTruthy();
              expect(expandedDiv!.textContent).toBe(expandedText);
            }
          ),
          { numRuns: 20 }
        );
      }, 30000);
    });
  });
});
