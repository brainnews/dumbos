/**
 * Settings Module - System preferences
 */
import Storage from '../../core/storage.js';
import Screensaver from '../../core/screensaver.js';

const DEFAULT_WALLPAPER = '/assets/wallpapers/dumbOS-wallpaper-01.jpg';

const SettingsModule = {
  id: 'settings',
  title: 'Settings',
  category: 'system',
  description: 'Customize your desktop',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  defaultSize: { width: 400, height: 500 },
  minSize: { width: 350, height: 350 },

  container: null,
  storage: null,

  /**
   * Initialize the module
   */
  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this._buildUI();
    this._applyBackground();
  },

  /**
   * Build the settings UI
   */
  _buildUI() {
    const clockFormat = Storage.get('clock', 'format', '24');
    const bgUrl = Storage.get('desktop', 'background-url', '');

    this.container.innerHTML = `
      <div class="settings-container">
        <div class="settings-section">
          <h3 class="settings-section-title">Background</h3>
          <div class="settings-row">
            <label class="settings-label">Solid Color</label>
            <input type="color" class="settings-color" data-setting="bg-color" value="${Storage.get('desktop', 'background-color', '#1a1a2e')}">
          </div>
          <div class="settings-row settings-row-stack">
            <label class="settings-label">Image URL</label>
            <div class="settings-input-group">
              <input type="url" class="settings-input" data-setting="bg-url" placeholder="https://example.com/image.jpg" value="${this._escapeHtml(bgUrl)}">
              <button class="settings-btn settings-btn-small" data-action="apply-bg-url">Apply</button>
            </div>
          </div>
          <div class="settings-row">
            <label class="settings-label">Upload Image</label>
            <input type="file" class="settings-file" data-setting="bg-file" accept="image/*">
          </div>
          <div class="settings-row">
            <label class="settings-label">Clear Background</label>
            <button class="settings-btn" data-action="clear-bg">Clear</button>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">Clock</h3>
          <div class="settings-row">
            <label class="settings-label">Time Format</label>
            <select class="settings-select" data-setting="clock-format">
              <option value="24" ${clockFormat === '24' ? 'selected' : ''}>24-hour</option>
              <option value="12" ${clockFormat === '12' ? 'selected' : ''}>12-hour</option>
            </select>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">Launcher</h3>
          <div class="settings-row">
            <div>
              <label class="settings-label">Search History</label>
              <p class="settings-description">Clear URL and search history from the taskbar launcher</p>
            </div>
            <button class="settings-btn" data-action="clear-launcher-history">Clear</button>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">RSS</h3>
          <div class="settings-row">
            <div>
              <label class="settings-label">NPR Text Mode</label>
              <p class="settings-description">Open NPR links in text-only version</p>
            </div>
            <input type="checkbox" class="settings-checkbox" data-setting="npr-text-mode" ${Storage.get('rss', 'nprTextMode', true) ? 'checked' : ''}>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">Screensaver</h3>
          <div class="settings-row">
            <div>
              <label class="settings-label">Enable Screensaver</label>
              <p class="settings-description">Activate after a period of inactivity</p>
            </div>
            <input type="checkbox" class="settings-checkbox" data-setting="screensaver-enabled" ${Storage.get('screensaver', 'enabled', false) ? 'checked' : ''}>
          </div>
          <div class="settings-row">
            <label class="settings-label">Idle Time</label>
            <select class="settings-select" data-setting="screensaver-idle">
              ${[1, 2, 3, 5, 10, 15, 30].map(min => `
                <option value="${min}" ${Storage.get('screensaver', 'idleMinutes', 5) === min ? 'selected' : ''}>${min} minute${min > 1 ? 's' : ''}</option>
              `).join('')}
            </select>
          </div>
          <div class="settings-row">
            <label class="settings-label">Style</label>
            <select class="settings-select" data-setting="screensaver-type">
              <option value="starfield" ${Storage.get('screensaver', 'type', 'starfield') === 'starfield' ? 'selected' : ''}>Starfield</option>
              <option value="matrix" ${Storage.get('screensaver', 'type', 'starfield') === 'matrix' ? 'selected' : ''}>Matrix</option>
              <option value="bouncing" ${Storage.get('screensaver', 'type', 'starfield') === 'bouncing' ? 'selected' : ''}>Bouncing Logo</option>
            </select>
          </div>
          <div class="settings-row">
            <label class="settings-label">Preview</label>
            <button class="settings-btn" data-action="preview-screensaver">Preview</button>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">AI</h3>
          <div class="settings-row settings-row-stack">
            <div>
              <label class="settings-label">Anthropic API Key</label>
              <p class="settings-description">Required for AI features in App Builder and Synth. Get a key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener">console.anthropic.com</a></p>
            </div>
            <div class="settings-input-group">
              <input type="password" class="settings-input settings-api-key-input" data-setting="api-key" placeholder="sk-ant-..." value="${this._escapeHtml(Storage.get('claude-api', 'apiKey', ''))}">
              <button class="settings-btn settings-btn-small" data-action="toggle-api-key">Show</button>
            </div>
            <p class="settings-api-status"></p>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">Tips</h3>
          <div class="settings-row settings-row-stack">
            <p class="settings-description">Want DumbOS to open every time you create a new tab? Install the <a href="https://chromewebstore.google.com/detail/new-tab-redirect/icpgjfneehieebagbmdbhnlpiopdcmna" target="_blank" rel="noopener">New Tab Redirect</a> extension and set it to <code>https://os.dumbsoft.com</code></p>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">Data</h3>
          <div class="settings-row settings-row-stack">
            <div class="settings-btn-group">
              <button class="settings-btn" data-action="export-data">Export Data</button>
              <button class="settings-btn" data-action="import-data">Import Data</button>
              <input type="file" class="settings-file-hidden" data-setting="import-file" accept=".json" style="display: none;">
            </div>
            <p class="settings-description">Export all settings and data to a file for backup or transfer.</p>
          </div>
        </div>

        <div class="settings-section settings-section-danger">
          <h3 class="settings-section-title">Reset</h3>
          <div class="settings-row">
            <div>
              <label class="settings-label">Factory Reset</label>
              <p class="settings-description">Clear all data and restore default settings</p>
            </div>
            <button class="settings-btn settings-btn-danger" data-action="factory-reset">Reset</button>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    this.container.querySelector('[data-setting="clock-format"]').addEventListener('change', (e) => {
      this._setClockFormat(e.target.value);
    });

    this.container.querySelector('[data-action="factory-reset"]').addEventListener('click', () => {
      this._factoryReset();
    });

    this.container.querySelector('[data-action="apply-bg-url"]').addEventListener('click', () => {
      const url = this.container.querySelector('[data-setting="bg-url"]').value.trim();
      if (url) {
        this._setBackgroundUrl(url);
      }
    });

    this.container.querySelector('[data-setting="bg-url"]').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const url = e.target.value.trim();
        if (url) {
          this._setBackgroundUrl(url);
        }
      }
    });

    this.container.querySelector('[data-setting="bg-file"]').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this._handleFileUpload(file);
      }
    });

    this.container.querySelector('[data-action="clear-bg"]').addEventListener('click', () => {
      this._clearBackground();
    });

    this.container.querySelector('[data-setting="bg-color"]').addEventListener('input', (e) => {
      this._setBackgroundColor(e.target.value);
    });

    this.container.querySelector('[data-setting="npr-text-mode"]').addEventListener('change', (e) => {
      Storage.set('rss', 'nprTextMode', e.target.checked);
    });

    this.container.querySelector('[data-action="clear-launcher-history"]').addEventListener('click', () => {
      Storage.remove('launcher', 'history');
      alert('Launcher history cleared.');
    });

    // Screensaver settings
    this.container.querySelector('[data-setting="screensaver-enabled"]').addEventListener('change', (e) => {
      Storage.set('screensaver', 'enabled', e.target.checked);
    });

    this.container.querySelector('[data-setting="screensaver-idle"]').addEventListener('change', (e) => {
      Storage.set('screensaver', 'idleMinutes', parseInt(e.target.value));
    });

    this.container.querySelector('[data-setting="screensaver-type"]').addEventListener('change', (e) => {
      Storage.set('screensaver', 'type', e.target.value);
    });

    this.container.querySelector('[data-action="preview-screensaver"]').addEventListener('click', () => {
      const type = Storage.get('screensaver', 'type', 'starfield');
      Screensaver.preview(type);
    });

    this.container.querySelector('[data-action="export-data"]').addEventListener('click', () => {
      this._exportData();
    });

    this.container.querySelector('[data-action="import-data"]').addEventListener('click', () => {
      this.container.querySelector('[data-setting="import-file"]').click();
    });

    this.container.querySelector('[data-setting="import-file"]').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this._importData(file);
        e.target.value = '';
      }
    });

    // API key handling
    const apiKeyInput = this.container.querySelector('[data-setting="api-key"]');
    const toggleBtn = this.container.querySelector('[data-action="toggle-api-key"]');
    const statusEl = this.container.querySelector('.settings-api-status');

    // Show/hide toggle
    toggleBtn.addEventListener('click', () => {
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleBtn.textContent = 'Hide';
      } else {
        apiKeyInput.type = 'password';
        toggleBtn.textContent = 'Show';
      }
    });

    // Save on blur with validation
    apiKeyInput.addEventListener('blur', () => {
      this._saveApiKey(apiKeyInput, statusEl);
    });

    // Also save on Enter
    apiKeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        apiKeyInput.blur();
      }
    });

    // Show initial status if key exists
    const existingKey = Storage.get('claude-api', 'apiKey', '');
    if (existingKey) {
      statusEl.textContent = 'Key saved';
      statusEl.className = 'settings-api-status settings-api-status-success';
    }
  },

  /**
   * Save and validate API key
   */
  _saveApiKey(input, statusEl) {
    const key = input.value.trim();

    if (!key) {
      Storage.remove('claude-api', 'apiKey');
      statusEl.textContent = '';
      statusEl.className = 'settings-api-status';
      window.dispatchEvent(new CustomEvent('settings-changed', {
        detail: { key: 'api-key', value: false }
      }));
      return;
    }

    if (!key.startsWith('sk-ant-')) {
      statusEl.textContent = 'Invalid format - key should start with sk-ant-';
      statusEl.className = 'settings-api-status settings-api-status-error';
      return;
    }

    Storage.set('claude-api', 'apiKey', key);
    statusEl.textContent = 'Key saved';
    statusEl.className = 'settings-api-status settings-api-status-success';
    window.dispatchEvent(new CustomEvent('settings-changed', {
      detail: { key: 'api-key', value: true }
    }));
  },

  /**
   * Set clock format
   */
  _setClockFormat(format) {
    Storage.set('clock', 'format', format);
    window.dispatchEvent(new CustomEvent('settings-changed', {
      detail: { key: 'clock-format', value: format }
    }));
  },

  /**
   * Set background from URL
   */
  _setBackgroundUrl(url) {
    Storage.set('desktop', 'background-url', url);
    Storage.remove('desktop', 'background-data');
    Storage.remove('desktop', 'background-color-active');
    this._applyBackground();
  },

  /**
   * Set background from solid color
   */
  _setBackgroundColor(color) {
    Storage.set('desktop', 'background-color', color);
    Storage.set('desktop', 'background-color-active', 'true');
    Storage.remove('desktop', 'background-url');
    Storage.remove('desktop', 'background-data');
    this.container.querySelector('[data-setting="bg-url"]').value = '';
    this._applyBackground();
  },

  /**
   * Handle file upload - convert to base64
   */
  _handleFileUpload(file) {
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Please use an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      Storage.set('desktop', 'background-data', dataUrl);
      Storage.remove('desktop', 'background-url');
      Storage.remove('desktop', 'background-color-active');
      this.container.querySelector('[data-setting="bg-url"]').value = '';
      this._applyBackground();
    };
    reader.readAsDataURL(file);
  },

  /**
   * Clear background
   */
  _clearBackground() {
    Storage.remove('desktop', 'background-url');
    Storage.remove('desktop', 'background-data');
    Storage.remove('desktop', 'background-color-active');
    this.container.querySelector('[data-setting="bg-url"]').value = '';
    this._applyBackground();
  },

  /**
   * Apply background to desktop
   */
  _applyBackground() {
    const desktop = document.getElementById('desktop');
    const url = Storage.get('desktop', 'background-url', '');
    const dataUrl = Storage.get('desktop', 'background-data', '');
    const bgColor = Storage.get('desktop', 'background-color', '#1a1a2e');
    const colorActive = Storage.get('desktop', 'background-color-active', '');

    if (colorActive && !url && !dataUrl) {
      // Solid color background
      desktop.style.backgroundImage = 'none';
      desktop.style.backgroundColor = bgColor;
    } else {
      // Image background
      const bgImage = dataUrl || url || DEFAULT_WALLPAPER;
      desktop.style.backgroundImage = `url("${bgImage}")`;
      desktop.style.backgroundColor = '';
    }
    desktop.style.backgroundSize = 'cover';
    desktop.style.backgroundPosition = 'center';
  },

  /**
   * Export all DumbOS data to a JSON file
   */
  _exportData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('dumbos:')) {
        data[key] = localStorage.getItem(key);
      }
    }

    const exportObj = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    const filename = `dumbos-backup-${date}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  },

  /**
   * Import data from a JSON file
   */
  _importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importObj = JSON.parse(e.target.result);

        if (!importObj.version || !importObj.data || typeof importObj.data !== 'object') {
          alert('Invalid backup file format.');
          return;
        }

        if (!confirm('This will replace your current data. Continue?')) {
          return;
        }

        // Validate import data can be written before clearing
        const newKeys = Object.entries(importObj.data).filter(([k]) => k.startsWith('dumbos:'));
        if (newKeys.length === 0) {
          alert('Backup file contains no data.');
          return;
        }

        // Backup current data in case import fails
        const backup = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('dumbos:')) {
            backup[key] = localStorage.getItem(key);
          }
        }

        // Clear existing dumbos:* keys
        Object.keys(backup).forEach(key => localStorage.removeItem(key));

        // Import all keys from backup file
        try {
          for (const [key, value] of newKeys) {
            localStorage.setItem(key, value);
          }
        } catch (writeErr) {
          // Restore from backup on failure
          Object.entries(backup).forEach(([key, value]) => {
            try { localStorage.setItem(key, value); } catch (_) {}
          });
          alert('Import failed — your data has been restored. Storage may be full.');
          return;
        }

        window.location.reload();
      } catch (err) {
        alert('Failed to parse backup file. Please ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
  },

  /**
   * Factory reset - clear all localStorage and reload
   */
  _factoryReset() {
    if (confirm('This will delete all your data including notes and saved feeds. Are you sure?')) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('dumbos:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      window.location.reload();
    }
  },

  /**
   * Escape HTML
   */
  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  /**
   * Render
   */
  render() {},

  /**
   * Cleanup
   */
  destroy() {}
};

// Apply background on page load
document.addEventListener('DOMContentLoaded', () => {
  const desktop = document.getElementById('desktop');
  const url = Storage.get('desktop', 'background-url', '');
  const dataUrl = Storage.get('desktop', 'background-data', '');
  const bgColor = Storage.get('desktop', 'background-color', '#1a1a2e');
  const colorActive = Storage.get('desktop', 'background-color-active', '');

  if (colorActive && !url && !dataUrl) {
    desktop.style.backgroundImage = 'none';
    desktop.style.backgroundColor = bgColor;
  } else {
    const bgImage = dataUrl || url || DEFAULT_WALLPAPER;
    desktop.style.backgroundImage = `url("${bgImage}")`;
    desktop.style.backgroundColor = '';
  }
  desktop.style.backgroundSize = 'cover';
  desktop.style.backgroundPosition = 'center';
});

export default SettingsModule;
