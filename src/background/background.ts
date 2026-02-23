// Background Service Worker
import { 
  ConfigUpdateMessage, 
  ValidateApiKeyMessage, 
  AIRequestMessage,
  AIResponseMessage,
  ValidationResultMessage
} from '@/types';

console.log('BoongAI Background Service Worker initialized');

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONFIG_UPDATE') {
    handleConfigUpdate(message as ConfigUpdateMessage, sendResponse);
    return true;
  }
  
  if (message.type === 'VALIDATE_API_KEY') {
    handleValidateApiKey(message as ValidateApiKeyMessage, sendResponse);
    return true;
  }
  
  if (message.type === 'AI_REQUEST') {
    handleAIRequest(message as AIRequestMessage, sendResponse);
    return true;
  }
  
  return false;
});

function handleConfigUpdate(message: ConfigUpdateMessage, sendResponse: (response: any) => void) {
  chrome.storage.local.set(message.config, () => {
    sendResponse({ success: true });
  });
}

function handleValidateApiKey(message: ValidateApiKeyMessage, sendResponse: (response: ValidationResultMessage) => void) {
  // TODO: Implement API key validation
  sendResponse({
    type: 'VALIDATION_RESULT',
    isValid: true
  });
}

function handleAIRequest(message: AIRequestMessage, sendResponse: (response: AIResponseMessage) => void) {
  // TODO: Implement AI request handling
  sendResponse({
    type: 'AI_RESPONSE',
    commentId: message.commentId,
    response: 'AI response placeholder',
    success: true
  });
}

// Extension lifecycle
chrome.runtime.onInstalled.addListener(() => {
  console.log('BoongAI Extension installed');
});
