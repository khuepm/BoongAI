// Background Service Worker
import { 
  ConfigUpdateMessage, 
  ValidateApiKeyMessage, 
  AIRequestMessage,
  AIResponseMessage,
  ValidationResultMessage
} from '@/types';
import { ConfigurationManager } from '@/utils/configurationManager';
import { APIValidator } from '@/utils/apiValidator';
import { AICommunicator } from '@/utils/aiCommunicator';
import { ErrorHandler } from '@/utils/errorHandler';

console.log('BoongAI Background Service Worker initialized');

// Message listener for popup and content script communication
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'CONFIG_UPDATE':
      handleConfigUpdate(message as ConfigUpdateMessage, sendResponse);
      return true; // keep channel open for async response

    case 'VALIDATE_API_KEY':
      handleValidateApiKey(message as ValidateApiKeyMessage, sendResponse);
      return true;

    case 'AI_REQUEST':
      handleAIRequest(message as AIRequestMessage, sendResponse);
      return true;

    default:
      return false;
  }
});

// --- Extension lifecycle events ---

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[BoongAI] Extension installed – initializing default config');
    ConfigurationManager.resetToDefaults();
  } else if (details.reason === 'update') {
    console.log('[BoongAI] Extension updated to', chrome.runtime.getManifest().version);
  }
});

// --- Message handlers ---

/**
 * Handle CONFIG_UPDATE messages from the popup.
 * Persists partial config updates via ConfigurationManager.
 */
async function handleConfigUpdate(
  message: ConfigUpdateMessage,
  sendResponse: (response: { success: boolean; error?: string }) => void
): Promise<void> {
  try {
    await ConfigurationManager.saveConfig(message.config);
    sendResponse({ success: true });
  } catch (error) {
    console.error('[BoongAI] Config update failed:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

/**
 * Handle VALIDATE_API_KEY messages from the popup.
 * Delegates to APIValidator and returns the result.
 */
async function handleValidateApiKey(
  message: ValidateApiKeyMessage,
  sendResponse: (response: ValidationResultMessage) => void
): Promise<void> {
  try {
    const result = await APIValidator.validateApiKey(message.provider, message.apiKey);
    sendResponse({
      type: 'VALIDATION_RESULT',
      isValid: result.isValid,
      error: result.error
    });
  } catch (error) {
    console.error('[BoongAI] API key validation failed:', error);
    sendResponse({
      type: 'VALIDATION_RESULT',
      isValid: false,
      error: APIValidator.getValidationError(error as Error)
    });
  }
}

/**
 * Handle AI_REQUEST messages from the content script.
 * Loads current config, builds the prompt, calls the AI provider,
 * and sends the response (or error) back.
 */
async function handleAIRequest(
  message: AIRequestMessage,
  sendResponse: (response: AIResponseMessage) => void
): Promise<void> {
  try {
    // Load current configuration for provider, model, and API key
    const config = await ConfigurationManager.loadConfig();

    // Decrypt the stored API key
    let apiKey = config.apiKey;
    if (apiKey) {
      try {
        apiKey = await ConfigurationManager.decryptApiKey(apiKey);
      } catch {
        // If decryption fails, use the raw value (may be unencrypted during dev)
        console.warn('[BoongAI] Could not decrypt API key, using raw value');
      }
    }

    // Build the prompt from user request + post context
    const prompt = AICommunicator.formatPrompt(message.userRequest, message.postContent);

    // Send the request to the configured AI provider
    const aiResponse = await AICommunicator.sendRequest({
      provider: config.aiProvider,
      model: config.model,
      apiKey,
      prompt,
      timeout: 30_000
    });

    sendResponse({
      type: 'AI_RESPONSE',
      commentId: message.commentId,
      response: aiResponse.text,
      success: true
    });
  } catch (error) {
    const errorMessage = AICommunicator.handleError(error as Error);

    // Log via ErrorHandler for structured console output
    ErrorHandler.handle(
      ErrorHandler.createError(
        mapErrorType(errorMessage.type),
        errorMessage.message,
        errorMessage.details
      ),
      { commentId: message.commentId, operation: 'AI_REQUEST', retryCount: 0 }
    );

    sendResponse({
      type: 'AI_RESPONSE',
      commentId: message.commentId,
      response: '',
      success: false,
      error: errorMessage
    });
  }
}

/**
 * Map AICommunicator error types to ErrorCode values used by ErrorHandler.
 */
function mapErrorType(type: string): 'API_TIMEOUT' | 'API_AUTH_FAILED' | 'API_RATE_LIMIT' | 'NETWORK_ERROR' | 'INVALID_CONFIG' {
  switch (type) {
    case 'timeout': return 'API_TIMEOUT';
    case 'auth': return 'API_AUTH_FAILED';
    case 'rate_limit': return 'API_RATE_LIMIT';
    case 'network': return 'NETWORK_ERROR';
    default: return 'NETWORK_ERROR';
  }
}
