// Popup UI Logic
import { ExtensionConfig, AIProvider, SUPPORTED_MODELS, ValidateApiKeyMessage, ValidationResultMessage } from '@/types';
import { ConfigurationManager } from '@/utils/configurationManager';

class PopupUI {
  private activeToggle!: HTMLInputElement;
  private providerSelect!: HTMLSelectElement;
  private modelSelect!: HTMLSelectElement;
  private apiKeyInput!: HTMLInputElement;
  private togglePasswordBtn!: HTMLButtonElement;
  private togglePasswordIcon!: HTMLElement;
  private connectionIndicator!: HTMLElement;
  private validationError!: HTMLElement;
  private apiGuideLink!: HTMLAnchorElement;
  private settingsView!: HTMLElement;
  private guideView!: HTMLElement;
  private backButton!: HTMLButtonElement;
  private openProviderSiteBtn!: HTMLButtonElement;
  private guideContent!: HTMLElement;
  private providerNameSpan!: HTMLElement;
  private currentConfig: ExtensionConfig | null = null;
  private validationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.activeToggle = document.getElementById('active-toggle') as HTMLInputElement;
    this.providerSelect = document.getElementById('provider') as HTMLSelectElement;
    this.modelSelect = document.getElementById('model') as HTMLSelectElement;
    this.apiKeyInput = document.getElementById('apikey') as HTMLInputElement;
    this.togglePasswordBtn = document.getElementById('toggle-password') as HTMLButtonElement;
    this.togglePasswordIcon = document.getElementById('toggle-password-icon') as HTMLElement;
    this.connectionIndicator = document.getElementById('connection-indicator') as HTMLElement;
    this.validationError = document.getElementById('validation-error') as HTMLElement;
    this.apiGuideLink = document.getElementById('api-guide-link') as HTMLAnchorElement;
    this.apiGuideModal = document.getElementById('api-guide-modal') as HTMLElement;
    this.closeModalBtn = document.getElementById('close-modal') as HTMLButtonElement;
    this.openProviderSiteBtn = document.getElementById('open-provider-site') as HTMLButtonElement;
    this.guideContent = document.getElementById('guide-content') as HTMLElement;
    this.providerNameSpan = document.getElementById('provider-name') as HTMLElement;
  }

  async initialize(): Promise<void> {
    await this.loadConfiguration();
    this.setupEventListeners();
    this.updateFloatingLabels();
  }

  private async loadConfiguration(): Promise<void> {
    this.currentConfig = await ConfigurationManager.loadConfig();

    this.activeToggle.checked = this.currentConfig.masterSwitch;
    this.providerSelect.value = this.currentConfig.aiProvider;

    // Update model list for the selected provider
    this.updateModelList(this.currentConfig.aiProvider);
    this.modelSelect.value = this.currentConfig.model;

    // Decrypt and display API key if stored
    if (this.currentConfig.apiKey) {
      try {
        const decryptedKey = await ConfigurationManager.decryptApiKey(this.currentConfig.apiKey);
        this.apiKeyInput.value = decryptedKey;
      } catch {
        this.apiKeyInput.value = '';
      }
    }

    // Show green indicator if validation is still fresh (< 1 hour)
    if (this.currentConfig.lastValidated > 0) {
      const age = Date.now() - this.currentConfig.lastValidated;
      if (age < 3_600_000) {
        this.updateConnectionIndicator(true);
      }
    }
  }

  private setupEventListeners(): void {
    this.activeToggle.addEventListener('change', () => this.handleMasterSwitchToggle());
    this.providerSelect.addEventListener('change', () => this.handleProviderSelection());
    this.modelSelect.addEventListener('change', () => this.handleModelSelection());
    this.apiKeyInput.addEventListener('input', () => this.handleApiKeyInput());
    this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
    this.apiGuideLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showApiGuideModal();
    });
    this.closeModalBtn.addEventListener('click', () => this.hideApiGuideModal());
    this.openProviderSiteBtn.addEventListener('click', () => this.openProviderSite());
    
    // Close modal when clicking outside
    this.apiGuideModal.addEventListener('click', (e) => {
      if (e.target === this.apiGuideModal) {
        this.hideApiGuideModal();
      }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.apiGuideModal.classList.contains('hidden')) {
        this.hideApiGuideModal();
      }
    });

    // Keep floating labels in sync
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
    this.updateModelList(provider);
    this.saveConfiguration({ aiProvider: provider, model: this.modelSelect.value });

    // Reset validation state when provider changes
    this.updateConnectionIndicator(null);
    this.hideValidationError();

    // Update modal content if it's currently open
    if (!this.apiGuideModal.classList.contains('hidden')) {
      this.updateGuideContent(provider);
      this.providerNameSpan.textContent = this.getProviderDisplayName(provider);
    }
  }

  private handleModelSelection(): void {
    this.saveConfiguration({ model: this.modelSelect.value });
  }

  private handleApiKeyInput(): void {
    const apiKey = this.apiKeyInput.value.trim();
    this.updateConnectionIndicator(null);
    this.hideValidationError();
    this.debounceValidation(apiKey);
  }

  private debounceValidation(apiKey: string): void {
    if (this.validationTimer) {
      clearTimeout(this.validationTimer);
    }
    this.validationTimer = setTimeout(() => {
      if (apiKey.length > 0) {
        this.validateApiKey(apiKey);
      }
    }, 500);
  }

  private async validateApiKey(apiKey: string): Promise<void> {
    const provider = this.providerSelect.value as AIProvider;
    const message: ValidateApiKeyMessage = {
      type: 'VALIDATE_API_KEY',
      provider,
      apiKey
    };

    try {
      const response = await chrome.runtime.sendMessage(message) as ValidationResultMessage;
      this.updateConnectionIndicator(response.isValid);

      if (response.isValid) {
        this.hideValidationError();
        const encryptedKey = await ConfigurationManager.encryptApiKey(apiKey);
        await this.saveConfiguration({ apiKey: encryptedKey, lastValidated: Date.now() });
      } else {
        this.showValidationError(response.error || 'API key validation failed.');
      }
    } catch (error) {
      this.updateConnectionIndicator(false);
      this.showValidationError('Could not validate API key. Please try again.');
    }
  }

  updateConnectionIndicator(isValid: boolean | null): void {
    if (isValid === true) {
      this.connectionIndicator.className = 'w-3 h-3 rounded-full bg-green-600 dark:bg-green-500 transition-colors duration-200';
      this.connectionIndicator.title = 'API key is valid';
    } else if (isValid === false) {
      this.connectionIndicator.className = 'w-3 h-3 rounded-full bg-red-600 dark:bg-red-500 transition-colors duration-200';
      this.connectionIndicator.title = 'API key is invalid';
    } else {
      this.connectionIndicator.className = 'w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-600 transition-colors duration-200';
      this.connectionIndicator.title = 'Not validated';
    }
  }

  private showValidationError(message: string): void {
    if (this.validationError) {
      this.validationError.textContent = message;
      this.validationError.classList.remove('hidden');
    }
  }

  private hideValidationError(): void {
    if (this.validationError) {
      this.validationError.textContent = '';
      this.validationError.classList.add('hidden');
    }
  }

  updateModelList(provider: AIProvider): void {
    this.modelSelect.innerHTML = '';
    const models = SUPPORTED_MODELS[provider];
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = this.formatModelName(model);
      this.modelSelect.appendChild(option);
    });
    if (models.length > 0) {
      this.modelSelect.value = models[0];
    }
  }

  private formatModelName(model: string): string {
    if (model.startsWith('gpt-')) {
      return model.toUpperCase().replace('GPT-', 'GPT-');
    } else if (model.startsWith('gemini-')) {
      return model.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    } else if (model.startsWith('claude-')) {
      return model.split('-').slice(0, 3).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    return model;
  }

  private togglePasswordVisibility(): void {
    const isCurrentlyPassword = this.apiKeyInput.type === 'password';
    
    if (isCurrentlyPassword) {
      // Show password as text
      this.apiKeyInput.type = 'text';
      this.togglePasswordIcon.textContent = 'visibility_off';
      this.togglePasswordBtn.setAttribute('aria-label', 'Hide API key');
      this.togglePasswordIcon.style.transform = 'scale(0.8)';
      setTimeout(() => {
        this.togglePasswordIcon.style.transform = 'scale(1)';
      }, 100);
    } else {
      // Hide password
      this.apiKeyInput.type = 'password';
      this.togglePasswordIcon.textContent = 'visibility';
      this.togglePasswordBtn.setAttribute('aria-label', 'Show API key');
      this.togglePasswordIcon.style.transform = 'scale(0.8)';
      setTimeout(() => {
        this.togglePasswordIcon.style.transform = 'scale(1)';
      }, 100);
    }
  }

  private showApiGuideModal(): void {
    const provider = this.providerSelect.value as AIProvider;
    this.updateGuideContent(provider);
    this.providerNameSpan.textContent = this.getProviderDisplayName(provider);
    this.apiGuideModal.classList.remove('hidden');
  }

  private hideApiGuideModal(): void {
    this.apiGuideModal.classList.add('hidden');
  }

  private openProviderSite(): void {
    const provider = this.providerSelect.value as AIProvider;
    const guideUrls: Record<AIProvider, string> = {
      openai: 'https://platform.openai.com/api-keys',
      gemini: 'https://makersuite.google.com/app/apikey',
      claude: 'https://console.anthropic.com/settings/keys'
    };
    chrome.tabs.create({ url: guideUrls[provider] });
    this.hideApiGuideModal();
  }

  private getProviderDisplayName(provider: AIProvider): string {
    const displayNames: Record<AIProvider, string> = {
      openai: 'OpenAI',
      gemini: 'Google',
      claude: 'Anthropic'
    };
    return displayNames[provider];
  }

  private updateGuideContent(provider: AIProvider): void {
    const guides: Record<AIProvider, string> = {
      openai: this.getOpenAIGuide(),
      gemini: this.getGeminiGuide(),
      claude: this.getClaudeGuide()
    };
    this.guideContent.innerHTML = guides[provider];
  }

  private getOpenAIGuide(): string {
    return `
      <div class="guide-step">
        <div class="flex items-start">
          <span class="guide-step-number">1</span>
          <div>
            <div class="guide-step-title">Create OpenAI Account</div>
            <div class="guide-step-description">
              Visit <strong>platform.openai.com</strong> and sign up for an account if you don't have one.
            </div>
          </div>
        </div>
      </div>

      <div class="guide-step">
        <div class="flex items-start">
          <span class="guide-step-number">2</span>
          <div>
            <div class="guide-step-title">Add Payment Method</div>
            <div class="guide-step-description">
              Go to <strong>Billing → Payment methods</strong> and add a credit card. OpenAI requires a payment method for API access.
            </div>
          </div>
        </div>
      </div>

      <div class="guide-step">
        <div class="flex items-start">
          <span class="guide-step-number">3</span>
          <div>
            <div class="guide-step-title">Generate API Key</div>
            <div class="guide-step-description">
              Navigate to <strong>API keys</strong> section and click <strong>"Create new secret key"</strong>. Give it a descriptive name like "BoongAI Extension".
            </div>
          </div>
        </div>
      </div>

      <div class="guide-step">
        <div class="flex items-start">
          <span class="guide-step-number">4</span>
          <div>
            <div class="guide-step-title">Copy and Paste</div>
            <div class="guide-step-description">
              Copy the generated API key (starts with <code class="code-snippet">sk-...</code>) and paste it into the API Key field above.
            </div>
          </div>
        </div>
      </div>

      <div class="guide-warning">
        <div class="guide-warning-title">
          <span class="material-symbols-outlined text-[16px] mr-2">warning</span>
          Important Security Note
        </div>
        <div class="guide-warning-description">
          Keep your API key secure and never share it publicly. The key will be encrypted and stored locally in your browser.
        </div>
      </div>
    `;
  }

  private getGeminiGuide(): string {
    return `
      <div class="guide-step">
        <div class="flex items-start">
          <span class="guide-step-number">1</span>
          <div>
            <div class="guide-step-title">Access Google AI Studio</div>
            <div class="guide-step-description">
              Visit <strong>makersuite.google.com</strong> and sign in with your Google account.
            </div>
          </div>
        </div>
      </div>

      <div class="guide-step">
        <div class="flex items-start">
          <span class="guide-step-number">2</span>
          <div>
            <div class="guide-step-title">Navigate to API Keys</div>
            <div class="guide-step-description">
              Click on <strong>"Get API key"</strong> in the left sidebar or go directly to the API keys section.
            </div>
          </div>
        </div>
      </div>

      <div class="guide-step">
        <div class="flex items-start">
          <span class="guide-step-number">3</span>
          <div>
            <div class="guide-step-title">Create New Key</div>
            <div class="guide-step-description">
              Click <strong>"Create API key"</strong> and select an existing Google Cloud project or create a new one.
            </div>
          </div>
        </div>
      </div>

      <div class="guide-step">
        <div class="flex items-start">
          <span class="guide-step-number">4</span>
          <div>
            <div class="guide-step-title">Copy Your Key</div>
            <div class="guide-step-description">
              Copy the generated API key (starts with <code class="code-snippet">AIza...</code>) and paste it into the API Key field above.
            </div>
          </div>
        </div>
      </div>

      <div class="guide-warning">
        <div class="guide-warning-title">
          <span class="material-symbols-outlined text-[16px] mr-2">info</span>
          Free Tier Available
        </div>
        <div class="guide-warning-description">
          Google Gemini offers a generous free tier with rate limits. No payment method required for basic usage.
        </div>
      </div>
    `;
  }

  private getClaudeGuide(): string {
    return `
      <div class="guide-step">
        <div class="flex items-start">
          <span class="guide-step-number">1</span>
          <div>
            <div class="guide-step-title">Create Anthropic Account</div>
            <div class="guide-step-description">
              Visit <strong>console.anthropic.com</strong> and create an account or sign in if you already have one.
            </div>
          </div>
        </div>
      </div>

      <div class="guide-step">
        <div class="flex items-start">
          <span class="guide-step-number">2</span>
          <div>
            <div class="guide-step-title">Add Credits</div>
            <div class="guide-step-description">
              Go to <strong>Settings → Billing</strong> and add credits to your account. Anthropic uses a prepaid credit system.
            </div>
          </div>
        </div>
      </div>

      <div class="guide-step">
        <div class="flex items-start">
          <span class="guide-step-number">3</span>
          <div>
            <div class="guide-step-title">Generate API Key</div>
            <div class="guide-step-description">
              Navigate to <strong>Settings → API Keys</strong> and click <strong>"Create Key"</strong>. Give it a name like "BoongAI Extension".
            </div>
          </div>
        </div>
      </div>

      <div class="guide-step">
        <div class="flex items-start">
          <span class="guide-step-number">4</span>
          <div>
            <div class="guide-step-title">Copy and Use</div>
            <div class="guide-step-description">
              Copy the generated API key (starts with <code class="code-snippet">sk-ant-...</code>) and paste it into the API Key field above.
            </div>
          </div>
        </div>
      </div>

      <div class="guide-warning">
        <div class="guide-warning-title">
          <span class="material-symbols-outlined text-[16px] mr-2">account_balance_wallet</span>
          Credit-Based Pricing
        </div>
        <div class="guide-warning-description">
          Anthropic uses prepaid credits. Monitor your usage in the console to avoid service interruption.
        </div>
      </div>
    `;
  }

  private handleGuideLink(): void {
    const guideUrls: Record<AIProvider, string> = {
      openai: 'https://platform.openai.com/api-keys',
      gemini: 'https://makersuite.google.com/app/apikey',
      claude: 'https://console.anthropic.com/settings/keys'
    };
    const provider = this.providerSelect.value as AIProvider;
    chrome.tabs.create({ url: guideUrls[provider] });
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

export { PopupUI };
