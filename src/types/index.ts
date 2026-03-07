// Core Configuration Types
export interface ExtensionConfig {
  version: string;
  masterSwitch: boolean;
  aiProvider: AIProvider;
  model: string;
  apiKey: string; // encrypted
  lastValidated: number;
}

export type AIProvider = 'openai' | 'gemini' | 'claude';

export const DEFAULT_CONFIG: ExtensionConfig = {
  version: '1.0.0',
  masterSwitch: true,
  aiProvider: 'openai',
  model: 'gpt-3.5-turbo',
  apiKey: '',
  lastValidated: 0
};

// AI Provider Models
export interface ProviderModels {
  openai: string[];
  gemini: string[];
  claude: string[];
}

export const SUPPORTED_MODELS: ProviderModels = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  claude: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
};

// Message Passing Types
export interface ConfigUpdateMessage {
  type: 'CONFIG_UPDATE';
  config: Partial<ExtensionConfig>;
}

export interface ValidateApiKeyMessage {
  type: 'VALIDATE_API_KEY';
  provider: AIProvider;
  apiKey: string;
}

export interface AIRequestMessage {
  type: 'AI_REQUEST';
  userRequest: string;
  postContent: string;
  commentId: string;
}

export interface AIResponseMessage {
  type: 'AI_RESPONSE';
  commentId: string;
  response: string;
  success: boolean;
  error?: ErrorMessage;
}

export interface ValidationResultMessage {
  type: 'VALIDATION_RESULT';
  isValid: boolean;
  error?: string;
}

// DOM Interaction Types
export interface CommentData {
  commentId: string;
  commentText: string;
  postId: string;
  timestamp: number;
  element?: HTMLElement; // Optional reference to the comment DOM element
}

export interface PostContent {
  postId: string;
  content: string;
  extractedAt: number;
  isComplete: boolean;
}

export interface FacebookComment {
  id: string;
  text: string;
  authorId: string;
  postId: string;
  parentCommentId?: string;
  timestamp: number;
  element: HTMLElement;
}

export interface FacebookPost {
  id: string;
  content: string;
  authorId: string;
  timestamp: number;
  hasMore: boolean;
  element: HTMLElement;
}

export interface GhostUIState {
  commentId: string;
  type: 'processing' | 'error';
  message: string;
  element: HTMLElement;
  createdAt: number;
}

// AI Communication Types
export interface AIRequestConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  prompt: string;
  timeout: number;
}

export interface AIResponse {
  text: string;
  provider: AIProvider;
  model: string;
  timestamp: number;
}

// Error Handling Types
export interface ExtensionError {
  code: ErrorCode;
  message: string;
  details?: string;
  timestamp: number;
  context?: Record<string, any>;
}

export type ErrorCode = 
  | 'API_TIMEOUT'
  | 'API_AUTH_FAILED'
  | 'API_RATE_LIMIT'
  | 'CONTEXT_EXTRACTION_FAILED'
  | 'REPLY_INJECTION_FAILED'
  | 'NETWORK_ERROR'
  | 'INVALID_CONFIG'
  | 'DOM_NOT_FOUND';

export interface ErrorMessage {
  type: 'timeout' | 'auth' | 'rate_limit' | 'network' | 'unknown';
  message: string;
  details?: string;
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  API_TIMEOUT: 'AI request timed out. Please try again.',
  API_AUTH_FAILED: 'Invalid API key. Please check your configuration.',
  API_RATE_LIMIT: 'Rate limit exceeded. Please wait and try again.',
  CONTEXT_EXTRACTION_FAILED: 'Could not extract post content. Please try again.',
  REPLY_INJECTION_FAILED: 'Could not post reply. Please try manually.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INVALID_CONFIG: 'Invalid configuration. Please reconfigure the extension.',
  DOM_NOT_FOUND: 'Could not find Facebook element. Please refresh the page.'
};

// API Validator Types
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  timestamp: number;
}

// Error Context
export interface ErrorContext {
  commentId?: string;
  operation: string;
  retryCount: number;
  additionalData?: Record<string, any>;
}

// Ghost UI Element
export interface GhostUIElement {
  id: string;
  type: 'processing' | 'error';
  content: string;
  createdAt: number;
}
