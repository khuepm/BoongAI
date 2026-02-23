// Popup UI logic
import { ExtensionConfig, SUPPORTED_MODELS, AIProvider } from '@/types';

document.addEventListener('DOMContentLoaded', () => {
  const activeToggle = document.getElementById('active-toggle') as HTMLInputElement;
  const providerSelect = document.getElementById('provider') as HTMLSelectElement;
  const modelSelect = document.getElementById('model') as HTMLSelectElement;
  const apiKeyInput = document.getElementById('apikey') as HTMLInputElement;
  const togglePasswordBtn = document.getElementById('toggle-password') as HTMLButtonElement;
  const togglePasswordIcon = document.getElementById('toggle-password-icon') as HTMLElement;
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;

  // Load saved settings
  chrome.storage.local.get(['masterSwitch', 'aiProvider', 'model', 'apiKey'], (result) => {
    if (result.masterSwitch !== undefined) activeToggle.checked = result.masterSwitch;
    if (result.aiProvider) {
      providerSelect.value = result.aiProvider;
      updateModelList(result.aiProvider);
    }
    if (result.model) modelSelect.value = result.model;
    if (result.apiKey) apiKeyInput.value = result.apiKey;
    updateFloatingLabels();
  });

  // Update model list based on provider selection
  function updateModelList(provider: AIProvider) {
    const models = SUPPORTED_MODELS[provider];
    modelSelect.innerHTML = '';
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });
  }

  // Handle provider change
  providerSelect.addEventListener('change', () => {
    const provider = providerSelect.value as AIProvider;
    updateModelList(provider);
  });

  // Handle floating labels logic
  function updateFloatingLabels() {
    [providerSelect, modelSelect, apiKeyInput].forEach(el => {
      if (el.value) {
        el.classList.add('has-value');
      } else {
        el.classList.remove('has-value');
      }
    });
  }

  [providerSelect, modelSelect, apiKeyInput].forEach(el => {
    el.addEventListener('input', updateFloatingLabels);
    el.addEventListener('change', updateFloatingLabels);
  });

  // Toggle password visibility
  togglePasswordBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      togglePasswordIcon.textContent = 'visibility_off';
    } else {
      apiKeyInput.type = 'password';
      togglePasswordIcon.textContent = 'visibility';
    }
  });

  // Save changes
  saveBtn.addEventListener('click', () => {
    const settings = {
      masterSwitch: activeToggle.checked,
      aiProvider: providerSelect.value,
      model: modelSelect.value,
      apiKey: apiKeyInput.value
    };
    chrome.storage.local.set(settings, () => {
      // Visual feedback
      const originalText = saveBtn.innerHTML;
      saveBtn.textContent = 'Saved!';
      saveBtn.classList.add('bg-green-600', 'dark:bg-green-500');
      setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.classList.remove('bg-green-600', 'dark:bg-green-500');
      }, 1500);
    });
  });
});
