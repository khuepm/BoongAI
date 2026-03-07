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
        'https://generativelanguage.googleapis.com/v1beta/models?key=test-gemini-key',
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

    test('Feature: boongai-facebook-assistant, Property 5: Connection indicator reflects validation state', () => {
      /**
       * Validates: Requirements 3.2, 3.3
       * 
       * Property: For any API key validation result, the connection indicator 
       * should display green when validation succeeds and red when validation fails.
       */
      fc.assert(
        fc.property(
          fc.boolean(),
          (isValid: boolean) => {
            // Set up DOM with connection indicator
            document.body.innerHTML = '<div data-testid="connection-indicator"></div>';
            
            // Update connection indicator based on validation result
            APIValidator.updateConnectionIndicator(isValid);
            
            // Get the indicator element
            const indicator = document.querySelector('[data-testid="connection-indicator"]');
            
            // Verify the indicator reflects the validation state
            if (isValid) {
              // When validation succeeds, indicator should display green (valid class)
              expect(indicator?.classList.contains('valid')).toBe(true);
              expect(indicator?.classList.contains('invalid')).toBe(false);
            } else {
              // When validation fails, indicator should display red (invalid class)
              expect(indicator?.classList.contains('invalid')).toBe(true);
              expect(indicator?.classList.contains('valid')).toBe(false);
            }
          }
        ),
        propertyTestConfig
      );
    });

    test('Feature: boongai-facebook-assistant, Property 6: Validation failure shows error message', async () => {
      /**
       * Validates: Requirements 3.5
       * 
       * Property: For any failed API key validation, an error message describing 
       * the failure reason should be displayed.
       */
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('openai' as const, 'gemini' as const, 'claude' as const),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom(
            { status: 401, errorType: 'authentication' },
            { status: 429, errorType: 'rate_limit' },
            { status: 403, errorType: 'forbidden' },
            { status: 500, errorType: 'server_error' }
          ),
          async (provider: AIProvider, apiKey: string, errorScenario: { status: number, errorType: string }) => {
            // Clear cache to ensure fresh validation
            APIValidator.clearCache();
            
            // Mock failed response with specific error
            const mockErrorMessage = `API error: ${errorScenario.errorType}`;
            (global.fetch as jest.Mock).mockResolvedValueOnce({
              ok: false,
              status: errorScenario.status,
              json: async () => ({ 
                error: { 
                  message: mockErrorMessage 
                } 
              })
            });

            // Trigger validation
            const result = await APIValidator.validateApiKey(provider, apiKey);

            // Property: For any failed API key validation, an error message 
            // describing the failure reason should be displayed
            
            // 1. Verify validation failed
            expect(result.isValid).toBe(false);
            
            // 2. Verify an error message is present and non-empty
            expect(result.error).toBeDefined();
            expect(result.error).not.toBe('');
            expect(typeof result.error).toBe('string');
            expect(result.error!.length).toBeGreaterThan(0);
            
            // 3. Verify the error message describes the failure reason
            // The error message should contain meaningful information about what went wrong
            // It should not be just a generic "error occurred" message
            
            // For authentication errors (401, 403), the message should indicate 
            // it's related to API key issues
            if (errorScenario.status === 401 || errorScenario.status === 403) {
              const errorLower = result.error!.toLowerCase();
              const hasRelevantInfo = 
                errorLower.includes('invalid') ||
                errorLower.includes('api key') ||
                errorLower.includes('check') ||
                errorLower.includes('authentication') ||
                errorLower.includes('error');
              expect(hasRelevantInfo).toBe(true);
            }
            
            // For rate limit errors (429), the message should indicate rate limiting
            if (errorScenario.status === 429) {
              const errorLower = result.error!.toLowerCase();
              const hasRateLimitInfo = 
                errorLower.includes('rate limit') ||
                errorLower.includes('exceeded') ||
                errorLower.includes('wait');
              expect(hasRateLimitInfo).toBe(true);
            }
            
            // For any error, the message should be descriptive (not just "error")
            expect(result.error!.toLowerCase()).not.toBe('error');
          }
        ),
        propertyTestConfig
      );
    }, 30000); // 30 second timeout
  });
});

