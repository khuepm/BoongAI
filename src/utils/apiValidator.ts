// API Validator Module
import { AIProvider, ValidationResult } from '@/types';

// Cache for validation results (1 hour TTL)
interface ValidationCache {
  [key: string]: ValidationResult;
}

const validationCache: ValidationCache = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const VALIDATION_TIMEOUT = 5000; // 5 seconds

export class APIValidator {
  /**
   * Validates an API key by making a minimal test request to the provider
   * Caches results for 1 hour to avoid unnecessary requests
   */
  static async validateApiKey(provider: AIProvider, apiKey: string): Promise<ValidationResult> {
    // Check cache first
    const cacheKey = `${provider}:${apiKey}`;
    const cached = validationCache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached;
    }

    // Perform validation based on provider
    let result: ValidationResult;
    
    try {
      switch (provider) {
        case 'openai':
          result = await this.validateOpenAI(apiKey);
          break;
        case 'gemini':
          result = await this.validateGemini(apiKey);
          break;
        case 'claude':
          result = await this.validateClaude(apiKey);
          break;
        default:
          result = {
            isValid: false,
            error: 'Unknown provider',
            timestamp: Date.now()
          };
      }
    } catch (error) {
      result = {
        isValid: false,
        error: this.getValidationError(error as Error),
        timestamp: Date.now()
      };
    }

    // Cache the result
    validationCache[cacheKey] = result;

    return result;
  }

  /**
   * Validates OpenAI API key by listing models
   */
  private static async validateOpenAI(apiKey: string): Promise<ValidationResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT);

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          isValid: true,
          timestamp: Date.now()
        };
      }

      // Handle specific error responses
      if (response.status === 401) {
        return {
          isValid: false,
          error: 'Invalid API key. Please check your OpenAI API key.',
          timestamp: Date.now()
        };
      }

      if (response.status === 429) {
        return {
          isValid: false,
          error: 'Rate limit exceeded. Please wait and try again.',
          timestamp: Date.now()
        };
      }

      const errorData = await response.json().catch(() => ({}));
      return {
        isValid: false,
        error: errorData.error?.message || `OpenAI API error: ${response.status}`,
        timestamp: Date.now()
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if ((error as Error).name === 'AbortError') {
        return {
          isValid: false,
          error: 'Validation request timed out. Please check your connection.',
          timestamp: Date.now()
        };
      }

      throw error;
    }
  }

  /**
   * Validates Google Gemini API key by making a test request
   */
  private static async validateGemini(apiKey: string): Promise<ValidationResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT);

    try {
      // Use the models list endpoint for validation
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          isValid: true,
          timestamp: Date.now()
        };
      }

      // Handle specific error responses
      if (response.status === 400 || response.status === 403) {
        return {
          isValid: false,
          error: 'Invalid API key. Please check your Gemini API key.',
          timestamp: Date.now()
        };
      }

      if (response.status === 429) {
        return {
          isValid: false,
          error: 'Rate limit exceeded. Please wait and try again.',
          timestamp: Date.now()
        };
      }

      const errorData = await response.json().catch(() => ({}));
      return {
        isValid: false,
        error: errorData.error?.message || `Gemini API error: ${response.status}`,
        timestamp: Date.now()
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if ((error as Error).name === 'AbortError') {
        return {
          isValid: false,
          error: 'Validation request timed out. Please check your connection.',
          timestamp: Date.now()
        };
      }

      throw error;
    }
  }

  /**
   * Validates Anthropic Claude API key by making a test request
   */
  private static async validateClaude(apiKey: string): Promise<ValidationResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT);

    try {
      // Make a minimal request to validate the API key
      // Using a very small max_tokens to minimize cost
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          isValid: true,
          timestamp: Date.now()
        };
      }

      // Handle specific error responses
      if (response.status === 401) {
        return {
          isValid: false,
          error: 'Invalid API key. Please check your Claude API key.',
          timestamp: Date.now()
        };
      }

      if (response.status === 429) {
        return {
          isValid: false,
          error: 'Rate limit exceeded. Please wait and try again.',
          timestamp: Date.now()
        };
      }

      const errorData = await response.json().catch(() => ({}));
      return {
        isValid: false,
        error: errorData.error?.message || `Claude API error: ${response.status}`,
        timestamp: Date.now()
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if ((error as Error).name === 'AbortError') {
        return {
          isValid: false,
          error: 'Validation request timed out. Please check your connection.',
          timestamp: Date.now()
        };
      }

      throw error;
    }
  }

  /**
   * Parses validation errors into user-friendly messages
   */
  static getValidationError(error: Error): string {
    if (error.message.includes('fetch')) {
      return 'Network error. Please check your internet connection.';
    }
    
    if (error.message.includes('timeout')) {
      return 'Validation request timed out. Please try again.';
    }

    return error.message || 'Unknown validation error occurred.';
  }

  /**
   * Updates the connection indicator UI (to be called from popup)
   */
  static updateConnectionIndicator(isValid: boolean): void {
    const indicator = document.querySelector('[data-testid="connection-indicator"]');
    if (indicator) {
      indicator.classList.remove('valid', 'invalid');
      indicator.classList.add(isValid ? 'valid' : 'invalid');
    }
  }

  /**
   * Clears the validation cache (useful for testing or manual refresh)
   */
  static clearCache(): void {
    Object.keys(validationCache).forEach(key => delete validationCache[key]);
  }
}
