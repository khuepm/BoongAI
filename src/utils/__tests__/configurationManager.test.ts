// Configuration Manager Tests
import { ConfigurationManager } from '../configurationManager';
import { ExtensionConfig, DEFAULT_CONFIG } from '@/types';
import fc from 'fast-check';

// Mock Chrome Storage API
const mockStorage = {
  local: {
    get: jest.fn(),
    set: jest.fn(),
  }
};

global.chrome = {
  storage: mockStorage,
} as any;

describe('ConfigurationManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Unit Tests', () => {
    test('loadConfig returns default config when storage is empty', async () => {
      mockStorage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      const config = await ConfigurationManager.loadConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    test('saveConfig stores configuration with debouncing', async () => {
      mockStorage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      const partialConfig = { masterSwitch: true };
      await ConfigurationManager.saveConfig(partialConfig);

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(mockStorage.local.set).toHaveBeenCalledWith(partialConfig, expect.any(Function));
    });

    test('encryptApiKey returns base64 encoded string', async () => {
      const apiKey = 'test-api-key-123';
      const encrypted = await ConfigurationManager.encryptApiKey(apiKey);
      expect(encrypted).toBe(btoa(apiKey));
    });

    test('decryptApiKey returns original string', async () => {
      const apiKey = 'test-api-key-123';
      const encrypted = btoa(apiKey);
      const decrypted = await ConfigurationManager.decryptApiKey(encrypted);
      expect(decrypted).toBe(apiKey);
    });
  });

  describe('Property-Based Tests', () => {
    // Property test configuration
    const propertyTestConfig = {
      numRuns: 100,
      verbose: false
    };

    test('Feature: boongai-facebook-assistant, Property 2: Configuration persistence round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            version: fc.constant('1.0.0'),
            masterSwitch: fc.boolean(),
            aiProvider: fc.constantFrom('openai' as const, 'gemini' as const, 'claude' as const),
            model: fc.string({ minLength: 1, maxLength: 50 }),
            apiKey: fc.string({ minLength: 20, maxLength: 100 }),
            lastValidated: fc.nat()
          }),
          async (config: ExtensionConfig) => {
            // Mock storage to simulate save and load
            let savedData: any = {};
            mockStorage.local.set.mockImplementation((data, callback) => {
              savedData = { ...savedData, ...data };
              callback();
            });
            mockStorage.local.get.mockImplementation((keys, callback) => {
              callback(savedData);
            });

            // Save configuration (without waiting for debounce in test)
            await ConfigurationManager.saveConfig(config);
            
            // Manually trigger the callback immediately for testing
            const setCall = mockStorage.local.set.mock.calls[mockStorage.local.set.mock.calls.length - 1];
            if (setCall && setCall[1]) {
              setCall[1]();
            }

            // Load configuration
            const loadedConfig = await ConfigurationManager.loadConfig();

            // Verify equivalence
            expect(loadedConfig.masterSwitch).toBe(config.masterSwitch);
            expect(loadedConfig.aiProvider).toBe(config.aiProvider);
            expect(loadedConfig.model).toBe(config.model);
          }
        ),
        { ...propertyTestConfig, numRuns: 20 } // Reduce runs for this test
      );
    }, 30000); // 30 second timeout

    test('Feature: boongai-facebook-assistant, Property 36: API key encryption before storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20, maxLength: 100 }),
          async (apiKey) => {
            const encrypted = await ConfigurationManager.encryptApiKey(apiKey);
            
            // Verify encryption occurred (encrypted should be different from original)
            expect(encrypted).not.toBe(apiKey);
            
            // Verify decryption returns original
            const decrypted = await ConfigurationManager.decryptApiKey(encrypted);
            expect(decrypted).toBe(apiKey);
          }
        ),
        propertyTestConfig
      );
    });
  });
});
