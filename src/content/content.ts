// Content Script - Main orchestrator
import { AIResponseMessage } from '@/types';

console.log('BoongAI Content Script injected into Facebook');

// Initialize modules
function initialize() {
  chrome.storage.local.get(['masterSwitch'], (result) => {
    if (result.masterSwitch) {
      enableExtension();
    }
  });
}

function enableExtension() {
  console.log('BoongAI Extension enabled');
  // TODO: Initialize DOM Observer and other modules
}

function disableExtension() {
  console.log('BoongAI Extension disabled');
  // TODO: Cleanup observers and event listeners
}

// Listen for configuration changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.masterSwitch) {
    if (changes.masterSwitch.newValue) {
      enableExtension();
    } else {
      disableExtension();
    }
  }
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AI_RESPONSE') {
    handleAIResponse(message as AIResponseMessage);
  }
});

function handleAIResponse(message: AIResponseMessage) {
  // TODO: Handle AI response and trigger auto-reply
  console.log('Received AI response:', message);
}

// Initialize on load
initialize();
