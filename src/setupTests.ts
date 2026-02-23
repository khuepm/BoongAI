// Setup file for Jest tests
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder and TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock Web Crypto API
const mockCrypto = {
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
  subtle: {
    importKey: jest.fn().mockResolvedValue('mock-key-material'),
    deriveKey: jest.fn().mockResolvedValue('mock-derived-key'),
    encrypt: jest.fn().mockImplementation(async (algorithm, key, data) => {
      // Simple mock encryption: just return the data with some padding
      const result = new Uint8Array(data.byteLength + 16);
      result.set(new Uint8Array(data), 0);
      return result.buffer;
    }),
    decrypt: jest.fn().mockImplementation(async (algorithm, key, data) => {
      // Simple mock decryption: remove padding
      const result = new Uint8Array(data).slice(0, -16);
      return result.buffer;
    }),
  }
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

// Mock Chrome API
const mockStorage = {
  local: {
    get: jest.fn(),
    set: jest.fn(),
  }
};

Object.defineProperty(global, 'chrome', {
  value: {
    storage: mockStorage,
  },
  writable: true
});
