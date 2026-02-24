import { APIValidator } from '../apiValidator';
import { AIProvider } from '@/types';
import fc from 'fast-check';

// Mock fetch globally
global.fetch = jest.fn();

describe('APIValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    APIValidator.clearCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('validateApiKey', () => {
    it('should validate OpenAI API key successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] })
      });

      const result = await APIValidator.validateApiKey('openai', 'sk-test123');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.timestamp).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test123'
          })
        })
      );
    });

    it('should return error for invalid OpenAI API key', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } })
      });

      const result = await APIValidator.validateApiKey('openai', 'invalid-key');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('should validate Gemini API key successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ models: [] })
      });

      const result = await APIValidator.validateApiKey('gemini', 'test-gemini-key');

      expect(result.isValid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1/models?key=test-gemini-key',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should return error for invalid Gemini API key', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'API key not valid' } })
      });

      const result = await APIValidator.validateApiKey('gemini', 'invalid-key');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('should validate Claude API key successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ content: [] })
      });

      const result = await APIValidator.validateApiKey('claude', 'test-claude-key');

      expect(result.isValid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-claude-key',
            'anthropic-version': '2023-06-01'
          })
        })
      );
    });

    it('should return error for invalid Claude API key', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } })
      });

      const result = await APIValidator.validateApiKey('claude', 'invalid-key');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('should handle rate limiting errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limit exceeded' } })
      });

      const result = await APIValidator.validateApiKey('openai', 'sk-test123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should handle timeout errors', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

      const result = await APIValidator.validateApiKey('openai', 'sk-test123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('fetch failed'));

      const result = await APIValidator.validateApiKey('openai', 'sk-test123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('caching', () => {
    it('should cache validation results for 1 hour', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] })
      });

      // First call
      const result1 = await APIValidator.validateApiKey('openai', 'sk-test123');
      expect(result1.isValid).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await APIValidator.validateApiKey('openai', 'sk-test123');
      expect(result2.isValid).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should invalidate cache after 1 hour', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] })
        });

      // First call
      await APIValidator.validateApiKey('openai', 'sk-test123');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Advance time by more than 1 hour
      jest.advanceTimersByTime(61 * 60 * 1000);

      // Second call should make a new request
      await APIValidator.validateApiKey('openai', 'sk-test123');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should cache different keys separately', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] })
        });

      await APIValidator.validateApiKey('openai', 'sk-key1');
      await APIValidator.validateApiKey('openai', 'sk-key2');

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should clear cache when clearCache is called', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] })
        });

      await APIValidator.validateApiKey('openai', 'sk-test123');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      APIValidator.clearCache();

      await APIValidator.validateApiKey('openai', 'sk-test123');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getValidationError', () => {
    it('should return network error message for fetch errors', () => {
      const error = new Error('fetch failed');
      const message = APIValidator.getValidationError(error);
      expect(message).toContain('Network error');
    });

    it('should return timeout error message for timeout errors', () => {
      const error = new Error('Request timeout');
      const message = APIValidator.getValidationError(error);
      expect(message).toContain('timed out');
    });

    it('should return generic error message for unknown errors', () => {
      const error = new Error('Something went wrong');
      const message = APIValidator.getValidationError(error);
      expect(message).toBe('Something went wrong');
    });
  });

  describe('updateConnectionIndicator', () => {
    it('should update indicator to valid state', () => {
      document.body.innerHTML = '<div data-testid="connection-indicator" class="invalid"></div>';
      
      APIValidator.updateConnectionIndicator(true);
      
      const indicator = document.querySelector('[data-testid="connection-indicator"]');
      expect(indicator?.classList.contains('valid')).toBe(true);
      expect(indicator?.classList.contains('invalid')).toBe(false);
    });

    it('should update indicator to invalid state', () => {
      document.body.innerHTML = '<div data-testid="connection-indicator" class="valid"></div>';
      
      APIValidator.updateConnectionIndicator(false);
      
      const indicator = document.querySelector('[data-testid="connection-indicator"]');
      expect(indicator?.classList.contains('invalid')).toBe(true);
      expect(indicator?.classList.contains('valid')).toBe(false);
    });

    it('should handle missing indicator element gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => {
        APIValidator.updateConnectionIndicator(true);
      }).not.toThrow();
    });
  });

  describe('Property-Based Tests', () => {
    // Property test configuration
    const propertyTestConfig = {
      numRuns: 100,
      verbose: false
    };

    test('Feature: boongai-facebook-assistant, Property 4: API key validation triggers on input', async () => {
      /**
       * Validates: Requirements 3.1
       * 
       * Property: For any API key input or modification, a validation request 
       * should be initiated to the selected AI provider.
       */
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('openai' as const, 'gemini' as const, 'claude' as const),
          fc.string({ minLength: 20, maxLength: 100 }),
          async (provider: AIProvider, apiKey: string) => {
            // Clear cache to ensure fresh validation
            APIValidator.clearCache();
            
            // Mock successful response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
              ok: true,
              status: 200,
              json: async () => ({ data: [] })
            });

            // Trigger validation
            const result = await APIValidator.validateApiKey(provider, apiKey);

            // Verify that a validation request was initiated
            expect(global.fetch).toHaveBeenCalled();
            
            // Verify the request was made to the correct provider
            const fetchCall = (global.fetch as jest.Mock).mock.calls[(global.fetch as jest.Mock).mock.calls.length - 1];
            const url = fetchCall[0];
            
            switch (provider) {
              case 'openai':
                expect(url).toContain('api.openai.com');
                break;
              case 'gemini':
                expect(url).toContain('generativelanguage.googleapis.com');
                break;
              case 'claude':
                expect(url).toContain('api.anthropic.com');
                break;
            }

            // Verify result contains timestamp (indicating validation occurred)
            expect(result.timestamp).toBeDefined();
            expect(typeof result.timestamp).toBe('number');
          }
        ),
        propertyTestConfig
      );
    }, 30000); // 30 second timeout
  });
});

