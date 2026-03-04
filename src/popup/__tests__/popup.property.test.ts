// Popup UI Property Tests
import fc from 'fast-check';
import { AIProvider, SUPPORTED_MODELS, DEFAULT_CONFIG } from '@/types';

// Helper to create the popup DOM structure
function createPopupDOM(): void {
  document.body.innerHTML = `
    <label class="m3-switch">
      <input type="checkbox" id="active-toggle" class="sr-only peer" />
      <div></div>
    </label>
    <select id="provider">
      <option value="openai">OpenAI</option>
      <option value="gemini">Google Gemini</option>
      <option value="claude">Anthropic Claude</option>
    </select>
    <select id="model">
      <option value="gpt-4">GPT-4</option>
    </select>
    <input id="apikey" type="password" placeholder=" " />
    <div id="connection-indicator" class="bg-gray-400" title="Not validated"></div>
    <p id="validation-error" class="hidden"></p>
    <button id="toggle-password"><span id="toggle-password-icon">visibility</span></button>
    <a id="api-guide-link" href="#">How to get an API key?</a>
    
    <!-- API Key Guide Modal -->
    <div id="api-guide-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center">
      <div class="bg-surface dark:bg-dark-surface rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-outline dark:border-gray-600 flex items-center justify-between">
          <h2 class="text-lg font-medium text-on-surface dark:text-dark-on-surface">Get API Key</h2>
          <button id="close-modal" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <span class="material-symbols-outlined text-on-surface-variant dark:text-gray-400">close</span>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-6">
          <div id="guide-content"></div>
        </div>
        <div class="px-6 py-4 border-t border-outline dark:border-gray-600 flex justify-end gap-3">
          <button id="open-provider-site" class="px-4 py-2 bg-primary dark:bg-dark-primary text-on-primary dark:text-dark-on-primary rounded-md hover:bg-primary-variant dark:hover:bg-dark-primary-variant transition-colors font-medium">
            Open <span id="provider-name">Provider</span> Site
          </button>
        </div>
      </div>
    </div>
  `;
}

// Set up Chrome API mocks
function setupChromeMocks(): void {
  const storedData: Record<string, any> = { ...DEFAULT_CONFIG };

  (global as any).chrome = {
    storage: {
      local: {
        get: jest.fn((_keys: any, cb: (result: any) => void) => cb({ ...storedData })),
        set: jest.fn((data: any, cb: () => void) => {
          Object.assign(storedData, data);
          cb();
        }),
      },
    },
    runtime: {
      sendMessage: jest.fn(),
    },
    tabs: {
      create: jest.fn(),
    },
  };
}

describe('Popup UI Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    createPopupDOM();
    setupChromeMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Property 1: Master switch controls all extension features', () => {
    /**
     * Validates: Requirements 1.2, 1.3, 1.5
     *
     * For any master switch state change, when the switch is enabled,
     * all monitoring and processing features should be active, and when
     * disabled, no mention triggers should be processed.
     */
    test('Feature: boongai-facebook-assistant, Property 1: Master switch controls all extension features', async () => {
      const { PopupUI } = await import('../../popup/popup');

      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (switchState: boolean) => {
            // Re-create DOM and mocks for each run
            createPopupDOM();
            setupChromeMocks();

            const popup = new PopupUI();
            await popup.initialize();

            // Simulate toggle
            const toggle = document.getElementById('active-toggle') as HTMLInputElement;
            toggle.checked = switchState;
            toggle.dispatchEvent(new Event('change'));

            // Wait for debounced save (500ms)
            jest.advanceTimersByTime(600);

            // Verify the config was saved with the correct master switch state
            const setCalls = (chrome.storage.local.set as jest.Mock).mock.calls;
            const lastSetCall = setCalls[setCalls.length - 1];
            expect(lastSetCall[0]).toHaveProperty('masterSwitch', switchState);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('master switch persists state across sessions', async () => {
      const { PopupUI } = await import('../../popup/popup');

      for (const state of [true, false, true]) {
        createPopupDOM();
        setupChromeMocks();

        // Pre-load stored state
        (chrome.storage.local.get as jest.Mock).mockImplementation((_k: any, cb: any) =>
          cb({ ...DEFAULT_CONFIG, masterSwitch: state })
        );

        const popup = new PopupUI();
        await popup.initialize();

        const toggle = document.getElementById('active-toggle') as HTMLInputElement;
        expect(toggle.checked).toBe(state);
      }
    });
  });

  describe('Property 3: Provider selection updates model list', () => {
    /**
     * Validates: Requirements 2.2
     *
     * For any AI provider selection, the available model list should
     * contain only models supported by that specific provider.
     */
    test('Feature: boongai-facebook-assistant, Property 3: Provider selection updates model list', async () => {
      const { PopupUI } = await import('../../popup/popup');

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<AIProvider>('openai', 'gemini', 'claude'),
          async (provider: AIProvider) => {
            createPopupDOM();
            setupChromeMocks();

            const popup = new PopupUI();
            await popup.initialize();

            // Change provider
            const providerSelect = document.getElementById('provider') as HTMLSelectElement;
            providerSelect.value = provider;
            providerSelect.dispatchEvent(new Event('change'));

            jest.advanceTimersByTime(600);

            // Verify model list matches SUPPORTED_MODELS for the provider
            const modelSelect = document.getElementById('model') as HTMLSelectElement;
            const expectedModels = SUPPORTED_MODELS[provider];
            const actualOptions = Array.from(modelSelect.options).map(o => o.value);

            expect(actualOptions).toEqual(expectedModels);
            expect(actualOptions.length).toBe(expectedModels.length);

            // First model should be selected by default
            expect(modelSelect.value).toBe(expectedModels[0]);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('model list updates within 100ms', async () => {
      const { PopupUI } = await import('../../popup/popup');

      createPopupDOM();
      setupChromeMocks();

      const popup = new PopupUI();
      await popup.initialize();

      const providers: AIProvider[] = ['openai', 'gemini', 'claude'];
      for (const provider of providers) {
        const providerSelect = document.getElementById('provider') as HTMLSelectElement;
        providerSelect.value = provider;

        const start = performance.now();
        popup.updateModelList(provider);
        const elapsed = performance.now() - start;

        // Requirement 2.5: update within 100ms
        expect(elapsed).toBeLessThan(100);
      }
    });
  });

  describe('Property 7: Guide link opens modal', () => {
    /**
     * Validates: Requirements 4.3
     *
     * For any click on the API key guide link, a modal should open
     * with provider-specific instructions.
     */
    test('Feature: boongai-facebook-assistant, Property 7: Guide link opens modal', async () => {
      const { PopupUI } = await import('../../popup/popup');

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<AIProvider>('openai', 'gemini', 'claude'),
          async (provider: AIProvider) => {
            createPopupDOM();
            setupChromeMocks();

            const popup = new PopupUI();
            await popup.initialize();

            // Set provider
            const providerSelect = document.getElementById('provider') as HTMLSelectElement;
            providerSelect.value = provider;
            providerSelect.dispatchEvent(new Event('change'));

            jest.advanceTimersByTime(600);

            // Click guide link
            const guideLink = document.getElementById('api-guide-link') as HTMLAnchorElement;
            guideLink.click();

            // Verify modal is shown
            const modal = document.getElementById('api-guide-modal') as HTMLElement;
            expect(modal.classList.contains('hidden')).toBe(false);

            // Verify provider name is updated
            const providerNameSpan = document.getElementById('provider-name') as HTMLElement;
            const expectedNames: Record<AIProvider, string> = {
              openai: 'OpenAI',
              gemini: 'Google',
              claude: 'Anthropic'
            };
            expect(providerNameSpan.textContent).toBe(expectedNames[provider]);

            // Verify guide content is populated
            const guideContent = document.getElementById('guide-content') as HTMLElement;
            expect(guideContent.innerHTML).not.toBe('');
            expect(guideContent.innerHTML.length).toBeGreaterThan(100);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('modal can be closed and opens provider site', async () => {
      const { PopupUI } = await import('../../popup/popup');

      createPopupDOM();
      setupChromeMocks();

      const popup = new PopupUI();
      await popup.initialize();

      // Open modal
      const guideLink = document.getElementById('api-guide-link') as HTMLAnchorElement;
      guideLink.click();

      const modal = document.getElementById('api-guide-modal') as HTMLElement;
      expect(modal.classList.contains('hidden')).toBe(false);

      // Test close button
      const closeBtn = document.getElementById('close-modal') as HTMLButtonElement;
      closeBtn.click();
      expect(modal.classList.contains('hidden')).toBe(true);

      // Re-open modal
      guideLink.click();
      expect(modal.classList.contains('hidden')).toBe(false);

      // Test provider site button
      const openSiteBtn = document.getElementById('open-provider-site') as HTMLButtonElement;
      openSiteBtn.click();

      // Verify chrome.tabs.create was called and modal is closed
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://platform.openai.com/api-keys', // default provider is openai
      });
      expect(modal.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Connection indicator reflects validation state', () => {
    test('indicator shows green for valid, red for invalid, gray for pending', async () => {
      const { PopupUI } = await import('../../popup/popup');

      createPopupDOM();
      setupChromeMocks();

      const popup = new PopupUI();
      await popup.initialize();

      const indicator = document.getElementById('connection-indicator') as HTMLElement;

      // Valid
      popup.updateConnectionIndicator(true);
      expect(indicator.className).toContain('bg-green-600');

      // Invalid
      popup.updateConnectionIndicator(false);
      expect(indicator.className).toContain('bg-red-600');

      // Pending / null
      popup.updateConnectionIndicator(null);
      expect(indicator.className).toContain('bg-gray-400');
    });
  });
});
