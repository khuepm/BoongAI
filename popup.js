document.addEventListener('DOMContentLoaded', () => {
  const activeToggle = document.getElementById('active-toggle');
  const providerSelect = document.getElementById('provider');
  const modelSelect = document.getElementById('model');
  const apiKeyInput = document.getElementById('apikey');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const togglePasswordIcon = document.getElementById('toggle-password-icon');
  const saveBtn = document.getElementById('save-btn');

  // Load saved settings
  chrome.storage.local.get(['isActive', 'provider', 'model', 'apikey'], (result) => {
    if (result.isActive !== undefined) activeToggle.checked = result.isActive;
    if (result.provider) providerSelect.value = result.provider;
    if (result.model) modelSelect.value = result.model;
    if (result.apikey) apiKeyInput.value = result.apikey;
    updateFloatingLabels();
  });

  // Handle floating labels logic (if needed to add has-value class)
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
      isActive: activeToggle.checked,
      provider: providerSelect.value,
      model: modelSelect.value,
      apikey: apiKeyInput.value
    };
    chrome.storage.local.set(settings, () => {
      // visual feedback
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
