// Background Service Worker
import {
  ConfigUpdateMessage,
  ValidateApiKeyMessage,
  AIRequestMessage,
  AIResponseMessage,
  ValidationResultMessage,
} from "@/types";
import { ConfigurationManager } from "@/utils/configurationManager";
import { APIValidator } from "@/utils/apiValidator";
import { AICommunicator } from "@/utils/aiCommunicator";
import { ErrorHandler } from "@/utils/errorHandler";

console.log("BoongAI Background Service Worker initialized");

// Message listener for popup and content script communication
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "CONFIG_UPDATE":
      handleConfigUpdate(message as ConfigUpdateMessage, sendResponse);
      return true; // keep channel open for async response

    case "VALIDATE_API_KEY":
      handleValidateApiKey(message as ValidateApiKeyMessage, sendResponse);
      return true;

    case "AI_REQUEST":
      handleAIRequest(message as AIRequestMessage, _sender);
      return false; // Don't use sendResponse for async, send via tabs.sendMessage instead

    default:
      return false;
  }
});

// --- Extension lifecycle events ---

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("[BoongAI] Extension installed – initializing default config");
    ConfigurationManager.resetToDefaults();
  } else if (details.reason === "update") {
    console.log(
      "[BoongAI] Extension updated to",
      chrome.runtime.getManifest().version,
    );
  }
});

// --- Message handlers ---

/**
 * Handle CONFIG_UPDATE messages from the popup.
 * Persists partial config updates via ConfigurationManager.
 */
async function handleConfigUpdate(
  message: ConfigUpdateMessage,
  sendResponse: (response: { success: boolean; error?: string }) => void,
): Promise<void> {
  try {
    await ConfigurationManager.saveConfig(message.config);
    sendResponse({ success: true });
  } catch (error) {
    console.error("[BoongAI] Config update failed:", error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

/**
 * Handle VALIDATE_API_KEY messages from the popup.
 * Delegates to APIValidator and returns the result.
 */
async function handleValidateApiKey(
  message: ValidateApiKeyMessage,
  sendResponse: (response: ValidationResultMessage) => void,
): Promise<void> {
  try {
    const result = await APIValidator.validateApiKey(
      message.provider,
      message.apiKey,
    );
    sendResponse({
      type: "VALIDATION_RESULT",
      isValid: result.isValid,
      error: result.error,
    });
  } catch (error) {
    console.error("[BoongAI] API key validation failed:", error);
    sendResponse({
      type: "VALIDATION_RESULT",
      isValid: false,
      error: APIValidator.getValidationError(error as Error),
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
  sender: chrome.runtime.MessageSender,
): Promise<void> {
  console.log("[BoongAI Background] ========== AI REQUEST START ==========");
  console.log("[BoongAI Background] Comment ID:", message.commentId);
  console.log("[BoongAI Background] User Request:", message.userRequest);
  console.log(
    "[BoongAI Background] Post Content:",
    message.postContent.substring(0, 200) + "...",
  );

  try {
    // Load current configuration for provider, model, and API key
    const config = await ConfigurationManager.loadConfig();
    console.log("[BoongAI Background] Config loaded:", {
      provider: config.aiProvider,
      model: config.model,
      hasApiKey: !!config.apiKey,
      masterSwitch: config.masterSwitch,
    });

    // Decrypt the stored API key
    let apiKey = config.apiKey;
    if (apiKey) {
      try {
        apiKey = await ConfigurationManager.decryptApiKey(apiKey);
        console.log("[BoongAI Background] API key decrypted successfully");
      } catch {
        // If decryption fails, use the raw value (may be unencrypted during dev)
        console.warn(
          "[BoongAI Background] Could not decrypt API key, using raw value",
        );
      }
    } else {
      console.error("[BoongAI Background] ❌ NO API KEY FOUND!");
      throw new Error(
        "API key not configured. Please set up your API key in the extension settings.",
      );
    }

    // Build the prompt from user request + post context
    const prompt = AICommunicator.formatPrompt(
      message.userRequest,
      message.postContent,
    );
    console.log(
      "[BoongAI Background] Prompt formatted:",
      prompt.substring(0, 200) + "...",
    );

    // Send the request to the configured AI provider
    console.log("[BoongAI Background] Sending request to AI provider...");
    const aiResponse = await AICommunicator.sendRequest({
      provider: config.aiProvider,
      model: config.model,
      apiKey,
      prompt,
      timeout: 30_000,
    });

    console.log(
      "[BoongAI Background] ✅ AI Response received:",
      aiResponse.text.substring(0, 200) + "...",
    );
    console.log(
      "[BoongAI Background] Response length:",
      aiResponse.text.length,
    );

    const responseMessage: AIResponseMessage = {
      type: "AI_RESPONSE",
      commentId: message.commentId,
      response: aiResponse.text,
      success: true,
    };

    console.log(
      "[BoongAI Background] Sending response back to content script...",
    );
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, responseMessage);
      console.log("[BoongAI Background] Response sent to tab:", sender.tab.id);
    } else {
      console.error("[BoongAI Background] No tab ID found in sender!");
    }
    console.log(
      "[BoongAI Background] ========== AI REQUEST SUCCESS ==========",
    );
  } catch (error) {
    console.error("[BoongAI Background] ❌ AI Request failed:", error);
    const errorMessage = AICommunicator.handleError(error as Error);
    console.error("[BoongAI Background] Error details:", errorMessage);

    // Log via ErrorHandler for structured console output
    ErrorHandler.handle(
      ErrorHandler.createError(
        mapErrorType(errorMessage.type),
        errorMessage.message,
        errorMessage.details,
      ),
      { commentId: message.commentId, operation: "AI_REQUEST", retryCount: 0 },
    );

    const responseMessage: AIResponseMessage = {
      type: "AI_RESPONSE",
      commentId: message.commentId,
      response: "",
      success: false,
      error: errorMessage,
    };

    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, responseMessage);
      console.log(
        "[BoongAI Background] Error response sent to tab:",
        sender.tab.id,
      );
    } else {
      console.error("[BoongAI Background] No tab ID found in sender!");
    }
    console.log("[BoongAI Background] ========== AI REQUEST FAILED ==========");
  }
}

/**
 * Map AICommunicator error types to ErrorCode values used by ErrorHandler.
 */
function mapErrorType(
  type: string,
):
  | "API_TIMEOUT"
  | "API_AUTH_FAILED"
  | "API_RATE_LIMIT"
  | "NETWORK_ERROR"
  | "INVALID_CONFIG" {
  switch (type) {
    case "timeout":
      return "API_TIMEOUT";
    case "auth":
      return "API_AUTH_FAILED";
    case "rate_limit":
      return "API_RATE_LIMIT";
    case "network":
      return "NETWORK_ERROR";
    default:
      return "NETWORK_ERROR";
  }
}
