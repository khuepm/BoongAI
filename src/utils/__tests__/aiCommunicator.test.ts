import { AICommunicator } from '../aiCommunicator';
import { AIProvider } from '@/types';

describe('AICommunicator', () => {
  describe('formatPrompt', () => {
    it('should combine user request and post content', () => {
      const userRequest = 'Summarize this post';
      const postContent = 'This is a test post about AI';
      
      const result = AICommunicator.formatPrompt(userRequest, postContent);
      
      expect(result).toContain(userRequest);
      expect(result).toContain(postContent);
      expect(result).toBe('Context: This is a test post about AI\n\nUser request: Summarize this post');
    });

    it('should handle empty post content', () => {
      const userRequest = 'Hello';
      const postContent = '';
      
      const result = AICommunicator.formatPrompt(userRequest, postContent);
      
      expect(result).toContain(userRequest);
      expect(result).toBe('Context: \n\nUser request: Hello');
    });

    it('should handle empty user request', () => {
      const userRequest = '';
      const postContent = 'Test content';
      
      const result = AICommunicator.formatPrompt(userRequest, postContent);
      
      expect(result).toContain(postContent);
      expect(result).toBe('Context: Test content\n\nUser request: ');
    });
  });

  describe('getRequestBody', () => {
    describe('OpenAI', () => {
      it('should format OpenAI request correctly', () => {
        const prompt = 'Test prompt';
        const model = 'gpt-3.5-turbo';
        
        const result = AICommunicator.getRequestBody('openai', prompt, model);
        
        expect(result).toEqual({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: 'Test prompt'
            }
          ],
          temperature: 0.7
        });
      });

      it('should work with different models', () => {
        const prompt = 'Test';
        const model = 'gpt-4';
        
        const result = AICommunicator.getRequestBody('openai', prompt, model);
        
        expect(result.model).toBe('gpt-4');
      });
    });

    describe('Gemini', () => {
      it('should format Gemini request correctly', () => {
        const prompt = 'Test prompt';
        const model = 'gemini-pro';
        
        const result = AICommunicator.getRequestBody('gemini', prompt, model);
        
        expect(result).toEqual({
          contents: [
            {
              parts: [
                {
                  text: 'Test prompt'
                }
              ]
            }
          ]
        });
      });
    });

    describe('Claude', () => {
      it('should format Claude request correctly', () => {
        const prompt = 'Test prompt';
        const model = 'claude-3-opus-20240229';
        
        const result = AICommunicator.getRequestBody('claude', prompt, model);
        
        expect(result).toEqual({
          model: 'claude-3-opus-20240229',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: 'Test prompt'
            }
          ]
        });
      });
    });

    it('should throw error for unsupported provider', () => {
      const prompt = 'Test';
      const model = 'test-model';
      
      expect(() => {
        AICommunicator.getRequestBody('invalid' as AIProvider, prompt, model);
      }).toThrow('Unsupported provider: invalid');
    });
  });

  describe('getHeaders', () => {
    it('should return OpenAI headers with Bearer token', () => {
      const apiKey = 'test-openai-key';
      
      const headers = AICommunicator.getHeaders('openai', apiKey);
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-openai-key'
      });
    });

    it('should return Gemini headers without API key', () => {
      const apiKey = 'test-gemini-key';
      
      const headers = AICommunicator.getHeaders('gemini', apiKey);
      
      expect(headers).toEqual({
        'Content-Type': 'application/json'
      });
    });

    it('should return Claude headers with x-api-key', () => {
      const apiKey = 'test-claude-key';
      
      const headers = AICommunicator.getHeaders('claude', apiKey);
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'x-api-key': 'test-claude-key',
        'anthropic-version': '2023-06-01'
      });
    });
  });

  describe('getUrl', () => {
    it('should return OpenAI URL', () => {
      const url = AICommunicator.getUrl('openai', 'gpt-3.5-turbo', 'test-key');
      
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
    });

    it('should return Gemini URL with model and API key', () => {
      const url = AICommunicator.getUrl('gemini', 'gemini-pro', 'test-key');
      
      expect(url).toBe('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=test-key');
    });

    it('should return Claude URL', () => {
      const url = AICommunicator.getUrl('claude', 'claude-3-opus-20240229', 'test-key');
      
      expect(url).toBe('https://api.anthropic.com/v1/messages');
    });
  });

  describe('SUPPORTED_MODELS constant', () => {
    it('should be defined in types', () => {
      // This test verifies that SUPPORTED_MODELS is properly exported from types
      const { SUPPORTED_MODELS } = require('@/types');
      
      expect(SUPPORTED_MODELS).toBeDefined();
      expect(SUPPORTED_MODELS.openai).toEqual(['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']);
      expect(SUPPORTED_MODELS.gemini).toEqual(['gemini-pro', 'gemini-pro-vision']);
      expect(SUPPORTED_MODELS.claude).toEqual([
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ]);
    });
  });

  describe('parseResponse', () => {
    describe('OpenAI', () => {
      it('should parse OpenAI response correctly', () => {
        const rawResponse = {
          choices: [
            {
              message: {
                content: 'This is the AI response'
              }
            }
          ]
        };

        const result = AICommunicator.parseResponse(rawResponse, 'openai');
        expect(result).toBe('This is the AI response');
      });

      it('should throw error for invalid OpenAI response', () => {
        const rawResponse = { invalid: 'response' };

        expect(() => {
          AICommunicator.parseResponse(rawResponse, 'openai');
        }).toThrow('Invalid OpenAI response format');
      });

      it('should handle empty choices array', () => {
        const rawResponse = { choices: [] };

        expect(() => {
          AICommunicator.parseResponse(rawResponse, 'openai');
        }).toThrow('Invalid OpenAI response format');
      });
    });

    describe('Gemini', () => {
      it('should parse Gemini response correctly', () => {
        const rawResponse = {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'This is the Gemini response'
                  }
                ]
              }
            }
          ]
        };

        const result = AICommunicator.parseResponse(rawResponse, 'gemini');
        expect(result).toBe('This is the Gemini response');
      });

      it('should throw error for invalid Gemini response', () => {
        const rawResponse = { invalid: 'response' };

        expect(() => {
          AICommunicator.parseResponse(rawResponse, 'gemini');
        }).toThrow('Invalid Gemini response format');
      });

      it('should handle empty candidates array', () => {
        const rawResponse = { candidates: [] };

        expect(() => {
          AICommunicator.parseResponse(rawResponse, 'gemini');
        }).toThrow('Invalid Gemini response format');
      });
    });

    describe('Claude', () => {
      it('should parse Claude response correctly', () => {
        const rawResponse = {
          content: [
            {
              text: 'This is the Claude response'
            }
          ]
        };

        const result = AICommunicator.parseResponse(rawResponse, 'claude');
        expect(result).toBe('This is the Claude response');
      });

      it('should throw error for invalid Claude response', () => {
        const rawResponse = { invalid: 'response' };

        expect(() => {
          AICommunicator.parseResponse(rawResponse, 'claude');
        }).toThrow('Invalid Claude response format');
      });

      it('should handle empty content array', () => {
        const rawResponse = { content: [] };

        expect(() => {
          AICommunicator.parseResponse(rawResponse, 'claude');
        }).toThrow('Invalid Claude response format');
      });
    });

    it('should throw error for unsupported provider', () => {
      const rawResponse = { test: 'data' };

      expect(() => {
        AICommunicator.parseResponse(rawResponse, 'invalid' as AIProvider);
      }).toThrow('Unsupported provider: invalid');
    });
  });

  describe('handleError', () => {
    it('should categorize timeout errors', () => {
      const error = new Error('Request timeout');
      error.name = 'AbortError';

      const result = AICommunicator.handleError(error);

      expect(result.type).toBe('timeout');
      expect(result.message).toBe('AI request timed out. Please try again.');
    });

    it('should categorize authentication errors (401)', () => {
      const error = new Error('API request failed: 401 Unauthorized');

      const result = AICommunicator.handleError(error);

      expect(result.type).toBe('auth');
      expect(result.message).toBe('Invalid API key. Please check your configuration.');
      expect(result.details).toContain('401');
    });

    it('should categorize authentication errors (403)', () => {
      const error = new Error('API request failed: 403 Forbidden');

      const result = AICommunicator.handleError(error);

      expect(result.type).toBe('auth');
      expect(result.message).toBe('Invalid API key. Please check your configuration.');
    });

    it('should categorize rate limit errors', () => {
      const error = new Error('API request failed: 429 Too Many Requests');

      const result = AICommunicator.handleError(error);

      expect(result.type).toBe('rate_limit');
      expect(result.message).toBe('Rate limit exceeded. Please wait and try again.');
    });

    it('should categorize network errors', () => {
      const error = new Error('fetch failed: NetworkError');

      const result = AICommunicator.handleError(error);

      expect(result.type).toBe('network');
      expect(result.message).toBe('Network error. Please check your connection.');
    });

    it('should categorize unknown errors', () => {
      const error = new Error('Something went wrong');

      const result = AICommunicator.handleError(error);

      expect(result.type).toBe('unknown');
      expect(result.message).toBe('Something went wrong');
    });
  });

  describe('sendRequest', () => {
    beforeEach(() => {
      // Reset fetch mock before each test
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should make successful API request to OpenAI', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'AI response text'
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const config = {
        provider: 'openai' as AIProvider,
        model: 'gpt-3.5-turbo',
        apiKey: 'test-key',
        prompt: 'Test prompt',
        timeout: 30000
      };

      const result = await AICommunicator.sendRequest(config);

      expect(result.text).toBe('AI response text');
      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-3.5-turbo');
      expect(result.timestamp).toBeDefined();
    });

    it('should make successful API request to Gemini', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Gemini response text'
                }
              ]
            }
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const config = {
        provider: 'gemini' as AIProvider,
        model: 'gemini-pro',
        apiKey: 'test-key',
        prompt: 'Test prompt',
        timeout: 30000
      };

      const result = await AICommunicator.sendRequest(config);

      expect(result.text).toBe('Gemini response text');
      expect(result.provider).toBe('gemini');
    });

    it('should make successful API request to Claude', async () => {
      const mockResponse = {
        content: [
          {
            text: 'Claude response text'
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const config = {
        provider: 'claude' as AIProvider,
        model: 'claude-3-opus-20240229',
        apiKey: 'test-key',
        prompt: 'Test prompt',
        timeout: 30000
      };

      const result = await AICommunicator.sendRequest(config);

      expect(result.text).toBe('Claude response text');
      expect(result.provider).toBe('claude');
    });

    it('should handle timeout with AbortError', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

      const config = {
        provider: 'openai' as AIProvider,
        model: 'gpt-3.5-turbo',
        apiKey: 'test-key',
        prompt: 'Test prompt',
        timeout: 100 // Short timeout for testing
      };

      await expect(AICommunicator.sendRequest(config)).rejects.toThrow('The operation was aborted');
    });

    it('should not retry on authentication errors', async () => {
      const authError = new Error('API request failed: 401 Unauthorized');

      (global.fetch as jest.Mock).mockRejectedValue(authError);

      const config = {
        provider: 'openai' as AIProvider,
        model: 'gpt-3.5-turbo',
        apiKey: 'invalid-key',
        prompt: 'Test prompt',
        timeout: 30000
      };

      await expect(AICommunicator.sendRequest(config)).rejects.toThrow('401');
      
      // Should only be called once (no retries for auth errors)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient errors with exponential backoff', async () => {
      const networkError = new Error('Network error');

      // Fail twice, then succeed
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Success after retry' } }]
          })
        });

      const config = {
        provider: 'openai' as AIProvider,
        model: 'gpt-3.5-turbo',
        apiKey: 'test-key',
        prompt: 'Test prompt',
        timeout: 30000
      };

      const result = await AICommunicator.sendRequest(config);

      expect(result.text).toBe('Success after retry');
      // Should be called 3 times (initial + 2 retries)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    }, 10000); // Increase timeout for this test due to backoff delays

    it('should fail after max retries', async () => {
      const networkError = new Error('Network error');

      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      const config = {
        provider: 'openai' as AIProvider,
        model: 'gpt-3.5-turbo',
        apiKey: 'test-key',
        prompt: 'Test prompt',
        timeout: 30000
      };

      await expect(AICommunicator.sendRequest(config)).rejects.toThrow('Network error');
      
      // Should be called 3 times (initial + 2 retries)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    }, 10000); // Increase timeout for this test due to backoff delays

    it('should handle non-OK response status', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({ error: 'Server error' })
      };

      // Mock should persist through retries
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const config = {
        provider: 'openai' as AIProvider,
        model: 'gpt-3.5-turbo',
        apiKey: 'test-key',
        prompt: 'Test prompt',
        timeout: 30000
      };

      await expect(AICommunicator.sendRequest(config)).rejects.toThrow('500');
    });
  });
});
