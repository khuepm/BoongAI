// Configuration Manager Module
import { ExtensionConfig, DEFAULT_CONFIG } from '@/types';

export class ConfigurationManager {
  private static debounceTimer: NodeJS.Timeout | null = null;

  static async loadConfig(): Promise<ExtensionConfig> {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        const config: ExtensionConfig = {
          version: result.version || DEFAULT_CONFIG.version,
          masterSwitch: result.masterSwitch !== undefined ? result.masterSwitch : DEFAULT_CONFIG.masterSwitch,
          aiProvider: result.aiProvider || DEFAULT_CONFIG.aiProvider,
          model: result.model || DEFAULT_CONFIG.model,
          apiKey: result.apiKey || DEFAULT_CONFIG.apiKey,
          lastValidated: result.lastValidated || DEFAULT_CONFIG.lastValidated
        };
        resolve(config);
      });
    });
  }

  static async saveConfig(config: Partial<ExtensionConfig>): Promise<void> {
    return new Promise((resolve) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(() => {
        chrome.storage.local.set(config, () => {
          resolve();
        });
      }, 500);
    });
  }

  static async encryptApiKey(apiKey: string): Promise<string> {
    // TODO: Implement proper encryption using Web Crypto API
    // For now, return base64 encoded (placeholder)
    return btoa(apiKey);
  }

  static async decryptApiKey(encryptedKey: string): Promise<string> {
    // TODO: Implement proper decryption using Web Crypto API
    // For now, return base64 decoded (placeholder)
    try {
      return atob(encryptedKey);
    } catch {
      return encryptedKey;
    }
  }

  static async resetToDefaults(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(DEFAULT_CONFIG, () => {
        resolve();
      });
    });
  }
}
