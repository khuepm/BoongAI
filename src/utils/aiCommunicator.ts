// AI Communicator Module
import {
  AIProvider,
  AIRequestConfig,
  AIResponse,
  ErrorMessage,
  SUPPORTED_MODELS,
} from "@/types";

// Mock mode for testing - set to true to bypass API calls
const MOCK_MODE = true;

// Mock response data
const MOCK_RESPONSE = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: 'Tuyệt vời, đây là vài gợi ý comment Facebook ngắn gọn, hài hước khi được tag vào bài đi chơi:\n\n**Kiểu hờn dỗi nhẹ (giả vờ):**\n\n1.  "Thôi được rồi, cứ vui vẻ đi, tôi ở nhà đắp chăn ngắm ảnh là được rồi 🥲"\n2.  "Nhìn ảnh là biết vui rồi đó nha... vui quá đáng! 😤"\n3.  "Ghen tị xỉu! Lần sau phải rủ tui đó nhaaa."\n\n**Kiểu khen và đòi đi lần sau:**\n\n4.  "Ulatr nhìn phát mê liền! Lần sau cho xin một slot nhé 😍"\n5.  "Nhìn ảnh là biết chất lượng rồi. Lần sau làm cái review địa điểm cho tui tham khảo với nha 😉"\n6.  "Tuyệt vời ông mặt trời! Lần sau nhớ gọi hồn tôi theo."\n\n**Kiểu tếu táo, chọc ghẹo:**\n\n7.  "Nhìn mặt đứa nào cũng tươi rói vậy ta... chắc vui lắm ha! 😂"\n8.  "Toàn ảnh đẹp thôi! Mà sao không thấy ảnh đồ ăn nhiều vậy ta? 😋"\n9.  "Cháy phố quá! Chúc mừng quý zị đã thoát khỏi kiếp deadline thành công. ✨"\n\n**Kiểu ngắn gọn, súc tích:**\n\n10. "Đỉnh của chóp! 🔥"\n11. "Nhìn là thấy không khí rồi đó! Quá đã."\n12. "Quá đáng yêu! 😍"\n\nChọn cái nào hợp với mối quan hệ và cá tính của bạn nhất nha!',
          },
        ],
        role: "model",
      },
      finishReason: "STOP",
      index: 0,
    },
  ],
  usageMetadata: {
    promptTokenCount: 25,
    candidatesTokenCount: 366,
    totalTokenCount: 1682,
    promptTokensDetails: [
      {
        modality: "TEXT",
        tokenCount: 25,
      },
    ],
    thoughtsTokenCount: 1291,
  },
  modelVersion: "gemini-2.5-flash",
  responseId: "CeCsac6cDYnZ0-kP7dXukAg",
};

// Provider-specific API endpoints
const API_ENDPOINTS = {
  openai: "https://api.openai.com/v1/chat/completions",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models",
  claude: "https://api.anthropic.com/v1/messages",
} as const;

// Provider-specific authentication methods
interface ProviderAuth {
  getHeaders: (apiKey: string) => Record<string, string>;
  getUrl: (model: string, apiKey?: string) => string;
}

const PROVIDER_AUTH: Record<AIProvider, ProviderAuth> = {
  openai: {
    getHeaders: (apiKey: string) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }),
    getUrl: () => API_ENDPOINTS.openai,
  },
  gemini: {
    getHeaders: () => ({
      "Content-Type": "application/json",
    }),
    getUrl: (model: string, apiKey: string = "") =>
      `${API_ENDPOINTS.gemini}/${model}:generateContent?key=${apiKey}`,
  },
  claude: {
    getHeaders: (apiKey: string) => ({
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    }),
    getUrl: () => API_ENDPOINTS.claude,
  },
};

export class AICommunicator {
  static async sendRequest(config: AIRequestConfig): Promise<AIResponse> {
    console.log(
      "[BoongAI AICommunicator] ========== API REQUEST START ==========",
    );
    console.log("[BoongAI AICommunicator] Provider:", config.provider);
    console.log("[BoongAI AICommunicator] Model:", config.model);
    console.log("[BoongAI AICommunicator] Has API Key:", !!config.apiKey);
    console.log("[BoongAI AICommunicator] Timeout:", config.timeout);

    // Mock mode - return hardcoded response without API call
    if (MOCK_MODE) {
      console.warn(
        "[BoongAI AICommunicator] 🧪 MOCK MODE ENABLED - Returning hardcoded response",
      );
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
      const text = this.parseResponse(MOCK_RESPONSE, "gemini");
      console.log(
        "[BoongAI AICommunicator] ✅ Mock response:",
        text.substring(0, 200) + "...",
      );
      console.log(
        "[BoongAI AICommunicator] ========== MOCK REQUEST SUCCESS ==========",
      );
      return {
        text,
        provider: config.provider,
        model: config.model,
        timestamp: Date.now(),
      };
    }

    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      console.log(
        `[BoongAI AICommunicator] Attempt ${attempt + 1}/${maxRetries + 1}`,
      );

      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        try {
          // Get provider-specific configuration
          const url = this.getUrl(config.provider, config.model, config.apiKey);
          const headers = this.getHeaders(config.provider, config.apiKey);
          const body = this.getRequestBody(
            config.provider,
            config.prompt,
            config.model,
          );

          console.log("[BoongAI AICommunicator] Request URL:", url);
          console.log("[BoongAI AICommunicator] Request Headers:", {
            ...headers,
            Authorization: headers.Authorization ? "***" : undefined,
            "x-api-key": headers["x-api-key"] ? "***" : undefined,
          });
          console.log(
            "[BoongAI AICommunicator] Request Body:",
            JSON.stringify(body).substring(0, 300) + "...",
          );

          // Make API request
          console.log("[BoongAI AICommunicator] Sending fetch request...");
          const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          console.log(
            "[BoongAI AICommunicator] Response status:",
            response.status,
            response.statusText,
          );

          // Handle non-OK responses
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(
              "[BoongAI AICommunicator] ❌ API Error Response:",
              errorData,
            );
            throw new Error(
              `API request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
            );
          }

          // Parse response
          const rawResponse = await response.json();
          console.log(
            "[BoongAI AICommunicator] Raw response:",
            JSON.stringify(rawResponse),
          );

          const text = this.parseResponse(rawResponse, config.provider);
          console.log(
            "[BoongAI AICommunicator] ✅ Parsed text:",
            text.substring(0, 200) + "...",
          );
          console.log(
            "[BoongAI AICommunicator] ========== API REQUEST SUCCESS ==========",
          );

          return {
            text,
            provider: config.provider,
            model: config.model,
            timestamp: Date.now(),
          };
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        lastError = error as Error;
        console.error(
          `[BoongAI AICommunicator] ❌ Attempt ${attempt + 1} failed:`,
          error,
        );

        // Check if it's an abort error (timeout)
        if (error instanceof Error && error.name === "AbortError") {
          console.error("[BoongAI AICommunicator] Request timed out");
          // Don't retry on timeout
          throw error;
        }

        // Check if it's an auth error (don't retry)
        if (error instanceof Error && error.message.includes("401")) {
          console.error("[BoongAI AICommunicator] Authentication failed");
          throw error;
        }

        // Check if it's a 404 model not found error - try fallback model
        if (
          error instanceof Error &&
          error.message.includes("404") &&
          error.message.includes("not found")
        ) {
          const fallbackModel = this.getFallbackModel(
            config.provider,
            config.model,
          );
          if (fallbackModel) {
            console.warn(
              `[BoongAI AICommunicator] Model ${config.model} not found (404), falling back to ${fallbackModel}`,
            );
            config.model = fallbackModel;
            // Don't count this as a retry attempt, just try again with new model
            continue;
          }
        }

        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          console.error(
            "[BoongAI AICommunicator] All retry attempts exhausted",
          );
          throw error;
        }

        // Exponential backoff: 2^attempt seconds
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`[BoongAI AICommunicator] Retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    // This should never be reached, but TypeScript needs it
    console.error(
      "[BoongAI AICommunicator] ========== API REQUEST FAILED ==========",
    );
    throw lastError || new Error("Request failed after retries");
  }

  static formatPrompt(userRequest: string, postContent: string): string {
    return `Context: ${postContent}\n\nUser request: ${userRequest}`;
  }

  static getSystemPrompt(): string {
    return `Bạn là trợ lý AI thông minh trên Facebook, được gọi là BoongAI. Nhiệm vụ của bạn là:
- Trả lời câu hỏi của người dùng dựa trên nội dung bài viết được cung cấp
- Đưa ra câu trả lời ngắn gọn, súc tích, dễ hiểu
- Sử dụng tiếng Việt tự nhiên, thân thiện
- Nếu không có đủ thông tin, hãy nói rõ thay vì đoán mò
- Tránh lặp lại nội dung bài viết, chỉ trích xuất thông tin cần thiết`;
  }

  static parseResponse(rawResponse: any, provider: AIProvider): string {
    try {
      switch (provider) {
        case "openai":
          // OpenAI response format: { choices: [{ message: { content: "..." } }] }
          if (rawResponse.choices && rawResponse.choices.length > 0) {
            return rawResponse.choices[0].message?.content || "";
          }
          throw new Error("Invalid OpenAI response format");

        case "gemini":
          // Gemini response format: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
          if (rawResponse.candidates && rawResponse.candidates.length > 0) {
            const parts = rawResponse.candidates[0].content?.parts;
            if (parts && parts.length > 0) {
              return parts[0].text || "";
            }
          }
          throw new Error("Invalid Gemini response format");

        case "claude":
          // Claude response format: { content: [{ text: "..." }] }
          if (rawResponse.content && rawResponse.content.length > 0) {
            return rawResponse.content[0].text || "";
          }
          throw new Error("Invalid Claude response format");

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      console.error("Error parsing response:", error, rawResponse);
      throw error;
    }
  }

  static handleError(error: Error): ErrorMessage {
    // Check for timeout
    if (error.name === "AbortError") {
      return {
        type: "timeout",
        message: "AI request timed out. Please try again.",
      };
    }

    // Check for authentication errors
    if (
      error.message.includes("401") ||
      error.message.includes("403") ||
      error.message.includes("Invalid API key")
    ) {
      return {
        type: "auth",
        message: "Invalid API key. Please check your configuration.",
        details: error.message,
      };
    }

    // Check for rate limiting
    if (error.message.includes("429") || error.message.includes("rate limit")) {
      return {
        type: "rate_limit",
        message: "Rate limit exceeded. Please wait and try again.",
        details: error.message,
      };
    }

    // Check for network errors
    if (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("NetworkError")
    ) {
      return {
        type: "network",
        message: "Network error. Please check your connection.",
        details: error.message,
      };
    }

    // Unknown error
    return {
      type: "unknown",
      message: error.message,
      details: error.stack,
    };
  }

  // Provider-specific request formatters
  private static formatOpenAIRequest(prompt: string, model: string): any {
    return {
      model: model,
      messages: [
        {
          role: "system",
          content: this.getSystemPrompt(),
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    };
  }

  private static formatGeminiRequest(prompt: string): any {
    return {
      systemInstruction: {
        parts: [{ text: this.getSystemPrompt() }],
      },
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };
  }

  private static formatClaudeRequest(prompt: string, model: string): any {
    return {
      model: model,
      system: this.getSystemPrompt(),
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    };
  }

  // Get provider-specific request body
  static getRequestBody(
    provider: AIProvider,
    prompt: string,
    model: string,
  ): any {
    switch (provider) {
      case "openai":
        return this.formatOpenAIRequest(prompt, model);
      case "gemini":
        return this.formatGeminiRequest(prompt);
      case "claude":
        return this.formatClaudeRequest(prompt, model);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  // Get provider-specific headers
  static getHeaders(
    provider: AIProvider,
    apiKey: string,
  ): Record<string, string> {
    return PROVIDER_AUTH[provider].getHeaders(apiKey);
  }

  // Get provider-specific URL
  static getUrl(provider: AIProvider, model: string, apiKey: string): string {
    return PROVIDER_AUTH[provider].getUrl(model, apiKey);
  }

  // Get fallback model when current model returns 404
  private static getFallbackModel(
    provider: AIProvider,
    currentModel: string,
  ): string | null {
    const models = SUPPORTED_MODELS[provider];
    const currentIndex = models.indexOf(currentModel);

    // If current model not in list or is last model, return first model as fallback
    if (currentIndex === -1 || currentIndex === models.length - 1) {
      return models[0];
    }

    // Return next model in list
    return models[currentIndex + 1];
  }
}
