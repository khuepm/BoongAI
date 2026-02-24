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
});
