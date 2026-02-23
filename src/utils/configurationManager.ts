// Configuration Manager Module
import { ExtensionConfig, DEFAULT_CONFIG } from '@/types';

export class ConfigurationManager {
  private static debounceTimer: NodeJS.Timeout | null = null;

  static async loadConfig(): Promise<ExtensionConfig> {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        try {
          // Validate loaded configuration
          const config: ExtensionConfig = {
            version: result.version || DEFAULT_CONFIG.version,
            masterSwitch: result.masterSwitch !== undefined ? result.masterSwitch : DEFAULT_CONFIG.masterSwitch,
            aiProvider: this.validateProvider(result.aiProvider) ? result.aiProvider : DEFAULT_CONFIG.aiProvider,
            model: result.model || DEFAULT_CONFIG.model,
            apiKey: result.apiKey || DEFAULT_CONFIG.apiKey,
            lastValidated: typeof result.lastValidated === 'number' ? result.lastValidated : DEFAULT_CONFIG.lastValidated
          };
          resolve(config);
        } catch (error) {
          // If configuration is corrupted, return defaults
          console.error('[BoongAI] Corrupted configuration detected, resetting to defaults', error);
          resolve({ ...DEFAULT_CONFIG });
        }
      });
    });
  }

  private static validateProvider(provider: any): provider is 'openai' | 'gemini' | 'claude' {
    return provider === 'openai' || provider === 'gemini' || provider === 'claude';
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
    try {
      // Generate a random salt
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      // Derive a key from a fixed password (in production, this could be user-specific)
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('boongai-extension-key'),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      
      // Generate a random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the API key
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        new TextEncoder().encode(apiKey)
      );
      
      // Combine salt, iv, and encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);
      
      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('[BoongAI] Encryption error:', error);
      throw new Error('Failed to encrypt API key');
    }
  }

  static async decryptApiKey(encryptedKey: string): Promise<string> {
    try {
      // Decode from base64
      const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
      
      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const encrypted = combined.slice(28);
      
      // Derive the same key using the salt
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('boongai-extension-key'),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      
      // Decrypt the API key
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('[BoongAI] Decryption error:', error);
      throw new Error('Failed to decrypt API key');
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
