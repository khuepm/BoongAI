// Popup UI Logic
import { ExtensionConfig, AIProvider, SUPPORTED_MODELS, ValidateApiKeyMessage, ValidationResultMessage } from '@/types';
import { ConfigurationManager } from '@/utils/configurationManager';

class PopupUI {
  private activeToggle: HTMLInputElement;
  private providerSelect: HTMLSelectElement;
  private modelSelect: HTMLSelectElement;
  private apiKeyInput: HTMLInputElement;
  private togglePasswordBtn: HTMLButtonElement;
  private togglePasswordIcon: HTMLElement;
  private connectionIndicator: HTMLElement;
  private apiGuideLink: HTMLAnchorElement;
  private currentConfig: ExtensionConfig | null = null;

  constructor() {
    this.activeToggle = document.getElementById('active-toggle') as HTMLInputElement;
    this.providerSelect = document.getElementById('provider') as HTMLSelectElement;
    this.modelSelect = document.getElementById('model') as HTMLSelectElement;
    this.apiKeyInput = document.getElementById('apikey') as HTMLInputElement;
    this.togglePasswordBtn = document.getElementById('toggle-password') as HTMLButtonElement;
    this.togglePasswordIcon = document.getElementById('toggle-password-icon') as HTMLElement;
    this.connectionIndicator = document.getElementById('connection-indicator') as HTMLElement;
    this.apiGuideLink = document.getElementById('api-guide-link') as HTMLAnchorElement;
  }

  async initialize(): Promise<void> {
    // Load configuration on popup open
    await this.loadConfiguration();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update floating labels
    this.updateFloatingLabels();
  }

  private async loadConfiguration(): Promise<void> {
    this.currentConfig = await ConfigurationManager.loadConfig();
    
    // Update UI with loaded configuration
    this.activeToggle.checked = this.currentConfig.masterSwitch;
    this.providerSelect.value = this.currentConfig.aiProvider;
    
    // Update model list for the selected provider
    this.updateModelList(this.currentConfig.aiProvider);
    this.modelSelect.value = this.currentConfig.model;
    
    // Decrypt and display API key if it exists
    if (this.currentConfig.apiKey) {
      try {
        const decryptedKey = await ConfigurationManager.decryptApiKey(this.currentConfig.apiKey);
        this.apiKeyInput.value = decryptedKey;
      } catch (error) {
        console.error('[BoongAI] Failed to decrypt API key:', error);
        this.apiKeyInput.value = '';
      }
    }
    
    // Update connection indicator based on last validation
    if (this.currentConfig.lastValidated > 0) {
      const timeSinceValidation = Date.now() - this.currentConfig.lastValidated;
      // Consider validation valid for 1 hour (3600000 ms)
      if (timeSinceValidation < 3600000) {
        this.updateConnectionIndicator(true);
      }
    }
  }

  private setupEventListeners(): void {
    // Master switch toggle
    this.activeToggle.addEventListener('change', () => {
      this.handleMasterSwitchToggle();
    });
    
    // AI provider selection
    this.providerSelect.addEventListener('change', () => {
      this.handleProviderSelection();
    });
    
    // Model selection
    this.modelSelect.addEventListener('change', () => {
      this.handleModelSelection();
    });
    
    // API key input
    this.apiKeyInput.addEventListener('input', () => {
      this.handleApiKeyInput();
    });
    
    // Password visibility toggle
    this.togglePasswordBtn.addEventListener('click', () => {
      this.togglePasswordVisibility();
    });
    
    // API guide link
    this.apiGuideLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleGuideLink();
    });
    
    // Update floating labels on input
    [this.providerSelect, this.modelSelect, this.apiKeyInput].forEach(el => {
      el.addEventListener('input', () => this.updateFloatingLabels());
      el.addEventListener('change', () => this.updateFloatingLabels());
    });
  }

  private async handleMasterSwitchToggle(): Promise<void> {
    const newState = this.activeToggle.checked;
    await ConfigurationManager.saveConfig({ masterSwitch: newState });
    
    if (this.currentConfig) {
      this.currentConfig.masterSwitch = newState;
    }
  }

  private handleProviderSelection(): void {
    const provider = this.providerSelect.value as AIProvider;
    
    // Update model list within 100ms (requirement 2.5)
    const startTime = performance.now();
    this.updateModelList(provider);
    const endTime = performance.now();
    
    console.log(`[BoongAI] Model list updated in ${endTime - startTime}ms`);
    
    // Save provider selection
    this.saveConfiguration({ aiProvider: provider, model: this.modelSelect.value });
  }

  private handleModelSelection(): void {
    const model = this.modelSelect.value;
    this.saveConfiguration({ model });
  }

  private handleApiKeyInput(): void {
    const apiKey = this.apiKeyInput.value.trim();
    
    // Reset connection indicator while typing
    this.updateConnectionIndicator(null);
    
    // Trigger validation after user stops typing (debounce)
    this.debounceValidation(apiKey);
  }

  private validationTimer: NodeJS.Timeout | null = null;
  
  private debounceValidation(apiKey: string): void {
    if (this.validationTimer) {
      clearTimeout(this.validationTimer);
    }
    
    // Wait 500ms after user stops typing before validating
    this.validationTimer = setTimeout(() => {
      if (apiKey.length > 0) {
        this.validateApiKey(apiKey);
      }
    }, 500);
  }

  private async validateApiKey(apiKey: string): Promise<void> {
    const provider = this.providerSelect.value as AIProvider;
    
    // Send validation request to background service worker
    const message: ValidateApiKeyMessage = {
      type: 'VALIDATE_API_KEY',
      provider,
      apiKey
    };
    
    try {
      const response = await chrome.runtime.sendMessage(message) as ValidationResultMessage;
      
      // Update connection indicator based on validation result
      this.updateConnectionIndicator(response.isValid);
      
      if (response.isValid) {
        // Encrypt and save API key
        const encryptedKey = await ConfigurationManager.encryptApiKey(apiKey);
        await this.saveConfiguration({ 
          apiKey: encryptedKey,
          lastValidated: Date.now()
        });
      } else {
        // Show error message in console
        console.error('[BoongAI] API key validation failed:', response.error);
      }
    } catch (error) {
      console.error('[BoongAI] Validation request failed:', error);
      this.updateConnectionIndicator(false);
    }
  }

  private updateConnectionIndicator(isValid: boolean | null): void {
    if (isValid === true) {
      // Green indicator for valid API key
      this.connectionIndicator.className = 'w-3 h-3 rounded-full bg-green-600 dark:bg-green-500 transition-colors duration-200';
      this.connectionIndicator.title = 'API key is valid';
    } else if (isValid === false) {
      // Red indicator for invalid API key
      this.connectionIndicator.className = 'w-3 h-3 rounded-full bg-red-600 dark:bg-red-500 transition-colors duration-200';
      this.connectionIndicator.title = 'API key is invalid';
    } else {
      // Gray indicator for not validated
      this.connectionIndicator.className = 'w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-600 transition-colors duration-200';
      this.connectionIndicator.title = 'Not validated';
    }
  }

  private updateModelList(provider: AIProvider): void {
    // Clear existing options
    this.modelSelect.innerHTML = '';
    
    // Get models for the selected provider
    const models = SUPPORTED_MODELS[provider];
    
    // Add options for each model
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = this.formatModelName(model);
      this.modelSelect.appendChild(option);
    });
    
    // Select the first model by default
    if (models.length > 0) {
      this.modelSelect.value = models[0];
    }
  }

  private formatModelName(model: string): string {
    // Format model names for display
    if (model.startsWith('gpt-')) {
      return model.toUpperCase().replace('GPT-', 'GPT-');
    } else if (model.startsWith('gemini-')) {
      return model.split('-').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
    } else if (model.startsWith('claude-')) {
      return model.split('-').slice(0, 3).map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
    }
    return model;
  }

  private togglePasswordVisibility(): void {
    if (this.apiKeyInput.type === 'password') {
      this.apiKeyInput.type = 'text';
      this.togglePasswordIcon.textContent = 'visibility_off';
    } else {
      this.apiKeyInput.type = 'password';
      this.togglePasswordIcon.textContent = 'visibility';
    }
  }

  private handleGuideLink(): void {
    // Open API key guide in a new tab
    const guideUrls: Record<AIProvider, string> = {
      openai: 'https://platform.openai.com/api-keys',
      gemini: 'https://makersuite.google.com/app/apikey',
      claude: 'https://console.anthropic.com/settings/keys'
    };
    
    const provider = this.providerSelect.value as AIProvider;
    const guideUrl = guideUrls[provider];
    
    chrome.tabs.create({ url: guideUrl });
  }

  private updateFloatingLabels(): void {
    [this.providerSelect, this.modelSelect, this.apiKeyInput].forEach(el => {
      if (el.value) {
        el.classList.add('has-value');
      } else {
        el.classList.remove('has-value');
      }
    });
  }

  private async saveConfiguration(updates: Partial<ExtensionConfig>): Promise<void> {
    await ConfigurationManager.saveConfig(updates);
    
    // Update current config
    if (this.currentConfig) {
      Object.assign(this.currentConfig, updates);
    }
  }
}

// Initialize popup UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const popup = new PopupUI();
  popup.initialize();
});

