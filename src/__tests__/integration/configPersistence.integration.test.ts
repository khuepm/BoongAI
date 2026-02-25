/**
 * Integration Test: Configuration Persistence and UI
 * Tests config save/load, encryption, master switch persistence, and connection indicator
 * Requirements: 1.4, 2.4, 3.2, 3.3, 14.4
 */

import { ConfigurationManager } from '../../utils/configurationManager';
import { APIValidator } from '../../utils/apiValidator';
import { DEFAULT_CONFIG, SUPPORTED_MODELS, AIProvider } from '../../types';

// Track what was stored
let mockStorageData: Record<string, any> = {};

// Mock chrome.storage.local
(global as any).chrome = {
  ...((global as any).chrome || {}),
  storage: {
    local: {
      get: jest.fn((keys: any, callback: (result: any) => void) => {
        if (keys === null) {
          callback({ ...mockStorageData });
        } else if (typeof keys === 'string') {
          callback({ [keys]: mockStorageData[keys] });
        } else if (Array.isArray(keys)) {
          const result: Record<string, any> = {};
          keys.forEach((k: string) => {
            if (k in mockStorageData) result[k] = mockStorageData[k];
          });
          callback(result);
        } else {
          callback({ ...mockStorageData });
        }
      }),
      set: jest.fn((data: Record<string, any>, callback?: () => void) => {
        Object.assign(mockStorageData, data);
        if (callback) callback();
      }),
    },
    onChanged: { addListener: jest.fn() },
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
    getManifest: jest.fn(() => ({ version: '1.0.0' })),
    onInstalled: { addListener: jest.fn() },
  },
  tabs: { create: jest.fn() },
};

describe('Integration: Configuration Persistence and UI', () => {
  beforeEach(() => {
    mockStorageData = {};
    jest.clearAllMocks();
    jest.useFakeTimers();
    APIValidator.clearCache();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper: save config and flush debounce timer
  async function saveAndFlush(config: Record<string, any>): Promise<void> {
    const promise = ConfigurationManager.saveConfig(config);
    jest.advanceTimersByTime(600); // flush 500ms debounce
    await promise;
  }

  describe('1. Master switch persistence across browser sessions', () => {
    test('should persist master switch state to storage', async () => {
      await saveAndFlush({ masterSwitch: true });
      expect(mockStorageData.masterSwitch).toBe(true);

      await saveAndFlush({ masterSwitch: false });
      expect(mockStorageData.masterSwitch).toBe(false);
    });

    test('should load master switch state from storage', async () => {
      mockStorageData = { masterSwitch: true, version: '1.0.0', aiProvider: 'openai', model: 'gpt-3.5-turbo', apiKey: '', lastValidated: 0 };

      const config = await ConfigurationManager.loadConfig();
      expect(config.masterSwitch).toBe(true);
    });

    test('should default to false when no stored state', async () => {
      mockStorageData = {};
      const config = await ConfigurationManager.loadConfig();
      expect(config.masterSwitch).toBe(DEFAULT_CONFIG.masterSwitch);
      expect(config.masterSwitch).toBe(false);
    });
  });

  describe('2. AI provider and model persistence', () => {
    test('should persist AI provider selection', async () => {
      const providers: AIProvider[] = ['openai', 'gemini', 'claude'];
      for (const provider of providers) {
        await saveAndFlush({ aiProvider: provider });
        expect(mockStorageData.aiProvider).toBe(provider);
      }
    });

    test('should persist model selection', async () => {
      await saveAndFlush({ model: 'gpt-4-turbo' });
      expect(mockStorageData.model).toBe('gpt-4-turbo');
    });

    test('should load provider and model from storage', async () => {
      mockStorageData = { aiProvider: 'claude', model: 'claude-3-opus-20240229', version: '1.0.0', masterSwitch: false, apiKey: '', lastValidated: 0 };

      const config = await ConfigurationManager.loadConfig();
      expect(config.aiProvider).toBe('claude');
      expect(config.model).toBe('claude-3-opus-20240229');
    });

    test('should fall back to defaults for invalid provider', async () => {
      mockStorageData = { aiProvider: 'invalid-provider', model: 'some-model' };

      const config = await ConfigurationManager.loadConfig();
      expect(config.aiProvider).toBe(DEFAULT_CONFIG.aiProvider);
    });

    test('should have correct models for each provider', () => {
      expect(SUPPORTED_MODELS.openai).toContain('gpt-4');
      expect(SUPPORTED_MODELS.openai).toContain('gpt-3.5-turbo');
      expect(SUPPORTED_MODELS.gemini).toContain('gemini-pro');
      expect(SUPPORTED_MODELS.claude).toContain('claude-3-opus-20240229');
    });
  });

  describe('3. API key encryption and persistence', () => {
    test('should encrypt and decrypt API key round-trip', async () => {
      const originalKey = 'sk-test-api-key-12345';
      const encrypted = await ConfigurationManager.encryptApiKey(originalKey);

      // Encrypted should be different from original
      expect(encrypted).not.toBe(originalKey);
      expect(encrypted.length).toBeGreaterThan(0);

      const decrypted = await ConfigurationManager.decryptApiKey(encrypted);
      expect(decrypted).toBe(originalKey);
    });

    test('should persist encrypted API key to storage', async () => {
      const apiKey = 'sk-test-key-persist';
      const encrypted = await ConfigurationManager.encryptApiKey(apiKey);

      await saveAndFlush({ apiKey: encrypted });

      expect(mockStorageData.apiKey).toBe(encrypted);
      expect(mockStorageData.apiKey).not.toBe(apiKey);
    });

    test('should load and decrypt API key from storage', async () => {
      const originalKey = 'sk-load-test-key';
      const encrypted = await ConfigurationManager.encryptApiKey(originalKey);
      mockStorageData = { apiKey: encrypted, version: '1.0.0', aiProvider: 'openai', model: 'gpt-3.5-turbo', masterSwitch: false, lastValidated: 0 };

      const config = await ConfigurationManager.loadConfig();
      // Config stores encrypted key
      expect(config.apiKey).toBe(encrypted);

      // Decrypt to verify
      const decrypted = await ConfigurationManager.decryptApiKey(config.apiKey);
      expect(decrypted).toBe(originalKey);
    });
  });

  describe('4. Connection indicator updates', () => {
    test('should update indicator to green on valid key', () => {
      document.body.innerHTML = '<div data-testid="connection-indicator" class=""></div>';
      APIValidator.updateConnectionIndicator(true);

      const indicator = document.querySelector('[data-testid="connection-indicator"]');
      expect(indicator?.classList.contains('valid')).toBe(true);
      expect(indicator?.classList.contains('invalid')).toBe(false);
    });

    test('should update indicator to red on invalid key', () => {
      document.body.innerHTML = '<div data-testid="connection-indicator" class=""></div>';
      APIValidator.updateConnectionIndicator(false);

      const indicator = document.querySelector('[data-testid="connection-indicator"]');
      expect(indicator?.classList.contains('invalid')).toBe(true);
      expect(indicator?.classList.contains('valid')).toBe(false);
    });
  });

  describe('5. Configuration save debouncing', () => {
    test('should debounce rapid config saves (500ms)', async () => {
      // Rapid saves - don't await, just fire them
      ConfigurationManager.saveConfig({ masterSwitch: true });
      ConfigurationManager.saveConfig({ masterSwitch: false });
      const lastSave = ConfigurationManager.saveConfig({ masterSwitch: true });

      jest.advanceTimersByTime(600);
      await lastSave;

      // After debounce, the last value should be persisted
      expect(mockStorageData.masterSwitch).toBe(true);
    });
  });

  describe('6. Corrupted configuration recovery', () => {
    test('should reset to defaults on corrupted config', async () => {
      // Simulate corrupted data
      mockStorageData = {
        version: 123, // should be string
        masterSwitch: 'yes', // should be boolean
        aiProvider: 'invalid', // should be valid provider
        model: null, // should be string
      };

      const config = await ConfigurationManager.loadConfig();

      // Should fall back to defaults for invalid fields
      expect(config.version).toBe(DEFAULT_CONFIG.version);
      expect(config.masterSwitch).toBe(DEFAULT_CONFIG.masterSwitch);
      expect(config.aiProvider).toBe(DEFAULT_CONFIG.aiProvider);
      expect(config.model).toBe(DEFAULT_CONFIG.model);
    });

    test('should handle completely empty storage', async () => {
      mockStorageData = {};
      const config = await ConfigurationManager.loadConfig();
      expect(config).toEqual(DEFAULT_CONFIG);
    });
  });

  describe('7. Reset to defaults', () => {
    test('should reset all config to default values', async () => {
      mockStorageData = { masterSwitch: true, aiProvider: 'claude', model: 'claude-3-opus-20240229', apiKey: 'encrypted-key' };

      await ConfigurationManager.resetToDefaults();

      expect(mockStorageData.masterSwitch).toBe(DEFAULT_CONFIG.masterSwitch);
      expect(mockStorageData.aiProvider).toBe(DEFAULT_CONFIG.aiProvider);
      expect(mockStorageData.model).toBe(DEFAULT_CONFIG.model);
      expect(mockStorageData.apiKey).toBe(DEFAULT_CONFIG.apiKey);
    });
  });
});
