// Configuration Manager Tests
import { ConfigurationManager } from '../configurationManager';
import { ExtensionConfig, DEFAULT_CONFIG } from '@/types';
import fc from 'fast-check';

describe('ConfigurationManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset chrome.storage mock
    (chrome.storage.local.get as jest.Mock).mockImplementation((keys, callback) => {
      callback({});
    });
    (chrome.storage.local.set as jest.Mock).mockImplementation((data, callback) => {
      callback();
    });
  });

  describe('Unit Tests', () => {
    test('loadConfig returns default config when storage is empty', async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementation((keys, callback) => {
        callback({});
      });

      const config = await ConfigurationManager.loadConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    test('saveConfig stores configuration with debouncing', async () => {
      (chrome.storage.local.set as jest.Mock).mockImplementation((data, callback) => {
        callback();
      });

      const partialConfig = { masterSwitch: true };
      await ConfigurationManager.saveConfig(partialConfig);

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(chrome.storage.local.set).toHaveBeenCalledWith(partialConfig, expect.any(Function));
    });

    test('encryptApiKey returns encrypted string different from original', async () => {
      const apiKey = 'test-api-key-123';
      const encrypted = await ConfigurationManager.encryptApiKey(apiKey);
      
      // Encrypted value should be different from original
      expect(encrypted).not.toBe(apiKey);
      
      // Encrypted value should be a valid base64 string
      expect(() => atob(encrypted)).not.toThrow();
    });

    test('decryptApiKey returns original string', async () => {
      const apiKey = 'test-api-key-123';
      const encrypted = await ConfigurationManager.encryptApiKey(apiKey);
      const decrypted = await ConfigurationManager.decryptApiKey(encrypted);
      expect(decrypted).toBe(apiKey);
    });

    test('encryptApiKey handles empty strings', async () => {
      const apiKey = '';
      const encrypted = await ConfigurationManager.encryptApiKey(apiKey);
      const decrypted = await ConfigurationManager.decryptApiKey(encrypted);
      expect(decrypted).toBe(apiKey);
    });

    test('decryptApiKey handles decryption errors gracefully', async () => {
      // Test with invalid encrypted data
      await expect(ConfigurationManager.decryptApiKey('invalid-encrypted-data')).rejects.toThrow('Failed to decrypt API key');
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
            (chrome.storage.local.set as jest.Mock).mockImplementation((data, callback) => {
              savedData = { ...savedData, ...data };
              callback();
            });
            (chrome.storage.local.get as jest.Mock).mockImplementation((keys, callback) => {
              callback(savedData);
            });

            // Save configuration (without waiting for debounce in test)
            await ConfigurationManager.saveConfig(config);
            
            // Manually trigger the callback immediately for testing
            const setCall = (chrome.storage.local.set as jest.Mock).mock.calls[(chrome.storage.local.set as jest.Mock).mock.calls.length - 1];
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

    test('Feature: boongai-facebook-assistant, Property 37: Corrupted config recovery', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Various types of corrupted data
            fc.constant(null),
            fc.constant(undefined),
            fc.constant('invalid-string'),
            fc.constant(12345),
            fc.record({
              version: fc.constant(null),
              masterSwitch: fc.constant('not-a-boolean'),
              aiProvider: fc.constant('invalid-provider'),
              model: fc.constant(null),
              apiKey: fc.constant(null),
              lastValidated: fc.constant('not-a-number')
            }),
            fc.record({
              // Missing required fields
              version: fc.constant('1.0.0')
            })
          ),
          async (corruptedData) => {
            // Mock storage to return corrupted data
            (chrome.storage.local.get as jest.Mock).mockImplementation((keys, callback) => {
              callback(corruptedData);
            });

            // Load configuration
            const loadedConfig = await ConfigurationManager.loadConfig();

            // Verify it returns valid default configuration
            expect(loadedConfig).toBeDefined();
            expect(loadedConfig.version).toBe(DEFAULT_CONFIG.version);
            expect(typeof loadedConfig.masterSwitch).toBe('boolean');
            expect(['openai', 'gemini', 'claude']).toContain(loadedConfig.aiProvider);
            expect(typeof loadedConfig.model).toBe('string');
            expect(typeof loadedConfig.apiKey).toBe('string');
            expect(typeof loadedConfig.lastValidated).toBe('number');
          }
        ),
        propertyTestConfig
      );
    });
  });
});
