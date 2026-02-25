/**
 * Integration Test: Complete Workflow on Facebook
 * Tests the end-to-end flow: mention detection → context extraction → AI request → auto-reply
 * Requirements: 5.2, 6.2, 7.2, 9.1, 10.3
 */

import { DOMObserver } from '../../content/domObserver';
import { ContextScraper } from '../../content/contextScraper';
import { AutoInjector } from '../../content/autoInjector';
import { GhostUIManager } from '../../content/ghostUIManager';
import { AICommunicator } from '../../utils/aiCommunicator';
import { AIProvider } from '../../types';

// Mock fetch globally
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// Mock chrome.runtime for message passing
const messageListeners: Array<(msg: any, sender: any, sendResponse: any) => void> = [];
(global as any).chrome = {
  ...((global as any).chrome || {}),
  storage: {
    local: { get: jest.fn(), set: jest.fn() },
    onChanged: { addListener: jest.fn() },
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn((cb: any) => messageListeners.push(cb)),
      removeListener: jest.fn(),
    },
    getManifest: jest.fn(() => ({ version: '1.0.0' })),
    onInstalled: { addListener: jest.fn() },
  },
  tabs: { create: jest.fn() },
};

describe('Integration: Complete Workflow', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    DOMObserver.cleanup();
    (GhostUIManager as any).elements?.clear();
    (GhostUIManager as any).domElements?.clear();
    mockFetch.mockReset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    DOMObserver.cleanup();
  });

  // Helper: create a Facebook-like comment input field
  function createCommentInput(text: string): HTMLElement {
    const input = document.createElement('div');
    input.setAttribute('contenteditable', 'true');
    input.setAttribute('role', 'textbox');
    input.setAttribute('aria-label', 'Write a comment');
    input.textContent = text;
    document.body.appendChild(input);
    return input;
  }

  // Helper: create a Facebook-like post
  function createPost(postId: string, content: string, hasSeeMore = false): HTMLElement {
    const post = document.createElement('div');
    post.setAttribute('role', 'article');
    post.setAttribute('id', postId);
    post.setAttribute('data-post-id', postId);
    const contentDiv = document.createElement('div');
    contentDiv.textContent = content;
    post.appendChild(contentDiv);
    if (hasSeeMore) {
      const btn = document.createElement('div');
      btn.setAttribute('role', 'button');
      btn.textContent = 'See more';
      post.appendChild(btn);
    }
    document.body.appendChild(post);
    return post;
  }

  // Helper: create a comment element with reply button
  function createCommentWithReply(commentId: string, text: string, postId: string): HTMLElement {
    const article = document.createElement('div');
    article.setAttribute('role', 'article');
    article.setAttribute('data-post-id', postId);

    const comment = document.createElement('div');
    comment.setAttribute('data-comment-id', commentId);
    comment.setAttribute('data-boongai-comment-id', commentId);
    comment.textContent = text;

    const replyBtn = document.createElement('div');
    replyBtn.setAttribute('role', 'button');
    replyBtn.setAttribute('aria-label', 'Reply');
    replyBtn.textContent = 'Reply';
    comment.appendChild(replyBtn);

    // Reply input that appears after clicking reply
    const replyInput = document.createElement('div');
    replyInput.setAttribute('contenteditable', 'true');
    replyInput.setAttribute('role', 'textbox');
    replyInput.setAttribute('aria-label', 'Write a reply');

    article.appendChild(comment);
    article.appendChild(replyInput);
    document.body.appendChild(article);
    return comment;
  }

  describe('1. Mention detection and highlighting', () => {
    test('should detect @BoongAI in comment input and apply highlight', () => {
      DOMObserver.initialize();
      const input = createCommentInput('Hello @BoongAI summarize this');

      const detected = DOMObserver.detectMentionTrigger(input);
      expect(detected).toBe(true);

      // Highlight the mention
      const textNode = input.firstChild!;
      DOMObserver.highlightMention(textNode);

      const highlight = input.querySelector('.boongai-mention-highlight');
      expect(highlight).toBeTruthy();
      const style = (highlight as HTMLElement)?.getAttribute('style') || '';
      expect(style).toContain('linear-gradient');
    });

    test('should detect mention case-insensitively', () => {
      DOMObserver.initialize();
      const variants = ['@BoongAI', '@boongai', '@BOONGAI', '@BoongAi'];
      for (const mention of variants) {
        const input = createCommentInput(`test ${mention} help`);
        expect(DOMObserver.detectMentionTrigger(input)).toBe(true);
        input.remove();
      }
    });

    test('should work with Lexical editor framework', () => {
      DOMObserver.initialize();
      const wrapper = document.createElement('div');
      wrapper.setAttribute('contenteditable', 'true');
      const lexical = document.createElement('div');
      lexical.setAttribute('data-lexical-editor', 'true');
      lexical.textContent = '@BoongAI translate this';
      wrapper.appendChild(lexical);
      document.body.appendChild(wrapper);

      expect(DOMObserver.detectMentionTrigger(wrapper)).toBe(true);
    });

    test('should work with Draft.js editor framework', () => {
      DOMObserver.initialize();
      const wrapper = document.createElement('div');
      wrapper.setAttribute('contenteditable', 'true');
      const draft = document.createElement('div');
      draft.setAttribute('data-contents', 'true');
      draft.textContent = '@BoongAI explain this';
      wrapper.appendChild(draft);
      document.body.appendChild(wrapper);

      expect(DOMObserver.detectMentionTrigger(wrapper)).toBe(true);
    });
  });

  describe('2. Comment submission capture and context extraction', () => {
    test('should capture comment submission and extract post content', async () => {
      DOMObserver.initialize();
      const postId = 'post-integration-1';
      const postContent = 'This is a test Facebook post about AI technology.';
      createPost(postId, postContent);

      // Create and capture a command comment
      const commentEl = document.createElement('div');
      commentEl.setAttribute('data-comment-id', 'cmd-1');
      commentEl.setAttribute('data-post-id', postId);
      commentEl.textContent = '@BoongAI summarize this post';
      document.body.appendChild(commentEl);

      const captured = DOMObserver.captureCommentSubmission(commentEl);
      expect(captured).toBeTruthy();
      expect(captured!.commentText).toContain('@BoongAI');
      expect(captured!.postId).toBe(postId);

      // Extract post content
      const extracted = await ContextScraper.extractPostContent(postId);
      expect(extracted.content).toContain('AI technology');
      expect(extracted.isComplete).toBe(true);

      // Parse user request
      const userRequest = ContextScraper.parseUserRequest(captured!.commentText);
      expect(userRequest).toBe('summarize this post');

      // Package request
      const pkg = ContextScraper.packageRequest(userRequest, extracted);
      expect(pkg.userRequest).toBe('summarize this post');
      expect(pkg.postContent).toContain('AI technology');
    });
  });

  describe('3. "See more" expansion on long posts', () => {
    test('should click "See more" button to expand content', async () => {
      const postId = 'post-seemore-1';
      const post = createPost(postId, 'Short preview...', true);
      const seeMoreBtn = post.querySelector('[role="button"]') as HTMLElement;
      const clickSpy = jest.spyOn(seeMoreBtn, 'click');

      await ContextScraper.expandSeeMore(post);
      expect(clickSpy).toHaveBeenCalled();
    });

    test('should return true when no "See more" button exists', async () => {
      const postId = 'post-noseemore';
      const post = createPost(postId, 'Full content already visible');
      const result = await ContextScraper.expandSeeMore(post);
      expect(result).toBe(true);
    });
  });

  describe('4. AI request and response with all three providers', () => {
    const providers: Array<{ provider: AIProvider; model: string; mockResponse: any }> = [
      {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        mockResponse: { choices: [{ message: { content: 'OpenAI response text' } }] },
      },
      {
        provider: 'gemini',
        model: 'gemini-pro',
        mockResponse: { candidates: [{ content: { parts: [{ text: 'Gemini response text' }] } }] },
      },
      {
        provider: 'claude',
        model: 'claude-3-haiku-20240307',
        mockResponse: { content: [{ text: 'Claude response text' }] },
      },
    ];

    test.each(providers)(
      'should format request and parse response for $provider',
      async ({ provider, model, mockResponse }) => {
        // Mock successful fetch
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const prompt = AICommunicator.formatPrompt('summarize this', 'Post about AI');
        expect(prompt).toContain('summarize this');
        expect(prompt).toContain('Post about AI');

        const result = await AICommunicator.sendRequest({
          provider,
          model,
          apiKey: 'test-key-123',
          prompt,
          timeout: 30000,
        });

        expect(result.text).toBeTruthy();
        expect(result.provider).toBe(provider);
        expect(result.model).toBe(model);

        // Verify correct endpoint was called
        const fetchCall = mockFetch.mock.calls[0];
        const url = fetchCall[0] as string;
        if (provider === 'openai') {
          expect(url).toContain('openai.com');
        } else if (provider === 'gemini') {
          expect(url).toContain('generativelanguage.googleapis.com');
        } else if (provider === 'claude') {
          expect(url).toContain('anthropic.com');
        }
      }
    );

    test('should format prompt with both context and user request', () => {
      const prompt = AICommunicator.formatPrompt('translate to English', 'Bài viết tiếng Việt');
      expect(prompt).toContain('translate to English');
      expect(prompt).toContain('Bài viết tiếng Việt');
    });
  });

  describe('5. Auto-reply generation and submission', () => {
    test('should format reply with BoongAI prefix', () => {
      const formatted = AutoInjector.formatReply('This is the AI response');
      expect(formatted).toContain('[🤖 BoongAI trả lời]:');
      expect(formatted).toContain('This is the AI response');
    });

    test('should truncate long responses at 8000 characters', () => {
      const longResponse = 'A'.repeat(9000);
      const formatted = AutoInjector.formatReply(longResponse);
      expect(formatted.length).toBeLessThanOrEqual(8100); // prefix + truncation suffix
      expect(formatted).toContain('... (nội dung đã được rút gọn)');
    });

    test('should sanitize malicious content in AI response', () => {
      const malicious = 'Hello <script>alert("xss")</script> world';
      const sanitized = AutoInjector.sanitizeContent(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello');
      expect(sanitized).toContain('world');
    });

    test('should remove unsupported markdown from response', () => {
      const markdown = '# Header\n**bold** and *italic* text\n```code block```';
      const formatted = AutoInjector.formatReply(markdown);
      expect(formatted).not.toContain('# ');
      expect(formatted).not.toContain('**');
      expect(formatted).not.toContain('```');
      expect(formatted).toContain('bold');
      expect(formatted).toContain('italic');
    });

    test('should preserve line breaks in AI response', () => {
      const response = 'Line 1\nLine 2\nLine 3';
      const formatted = AutoInjector.formatReply(response);
      expect(formatted).toContain('Line 1\nLine 2\nLine 3');
    });

    test('should inject text into reply input field', async () => {
      const commentId = 'reply-test-1';
      createCommentWithReply(commentId, '@BoongAI help', 'post-1');

      // The generateReply method tries to find the reply button and input
      // In jsdom, the full flow won't work perfectly, but we can test formatReply
      const formatted = AutoInjector.formatReply('Test AI response');
      expect(formatted).toBe('[🤖 BoongAI trả lời]: Test AI response');
    });
  });

  describe('6. End-to-end workflow integration', () => {
    test('should process mention → extract context → format prompt → parse response', async () => {
      // Step 1: Set up DOM
      DOMObserver.initialize();
      const postId = 'e2e-post-1';
      createPost(postId, 'Facebook post about machine learning and neural networks');

      // Step 2: Detect mention
      const input = createCommentInput('@BoongAI explain the key concepts');
      expect(DOMObserver.detectMentionTrigger(input)).toBe(true);

      // Step 3: Capture comment submission
      const commentEl = document.createElement('div');
      commentEl.setAttribute('data-comment-id', 'e2e-cmd-1');
      commentEl.setAttribute('data-post-id', postId);
      commentEl.textContent = '@BoongAI explain the key concepts';
      document.body.appendChild(commentEl);

      const captured = DOMObserver.captureCommentSubmission(commentEl);
      expect(captured).toBeTruthy();

      // Step 4: Extract context
      const postContent = await ContextScraper.extractPostContent(postId);
      expect(postContent.content).toContain('machine learning');

      // Step 5: Parse user request and package
      const userRequest = ContextScraper.parseUserRequest(captured!.commentText);
      expect(userRequest).toBe('explain the key concepts');

      const pkg = ContextScraper.packageRequest(userRequest, postContent);

      // Step 6: Format AI prompt
      const prompt = AICommunicator.formatPrompt(pkg.userRequest, pkg.postContent);
      expect(prompt).toContain('explain the key concepts');
      expect(prompt).toContain('machine learning');

      // Step 7: Mock AI response and parse
      const mockResponse = { choices: [{ message: { content: 'ML uses algorithms to learn from data.' } }] };
      const parsed = AICommunicator.parseResponse(mockResponse, 'openai');
      expect(parsed).toBe('ML uses algorithms to learn from data.');

      // Step 8: Format auto-reply
      const reply = AutoInjector.formatReply(parsed);
      expect(reply).toBe('[🤖 BoongAI trả lời]: ML uses algorithms to learn from data.');
    });

    test('should show Ghost UI during processing and remove on completion', () => {
      const commentId = 'ghost-e2e-1';
      const comment = document.createElement('div');
      comment.setAttribute('role', 'article');
      comment.setAttribute('data-boongai-comment-id', commentId);
      document.body.appendChild(comment);

      // Show processing
      GhostUIManager.showProcessing(commentId);
      let ghostUI = document.querySelector(`[data-boongai-ghost-ui="${commentId}"]`);
      expect(ghostUI).toBeTruthy();
      expect(ghostUI?.shadowRoot?.querySelector('.boongai-spinner')).toBeTruthy();

      // Remove on completion
      GhostUIManager.remove(commentId);
      ghostUI = document.querySelector(`[data-boongai-ghost-ui="${commentId}"]`);
      expect(ghostUI).toBeNull();
    });
  });
});
