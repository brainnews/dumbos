/**
 * Settings Module - System preferences
 */
import Storage from '../../core/storage.js';

const DEFAULT_WALLPAPER = '/assets/wallpapers/dumbOS-wallpaper-01.jpg';

const SettingsModule = {
  id: 'settings',
  title: 'Settings',
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

    this.container.querySelector('[data-setting="npr-text-mode"]').addEventListener('change', (e) => {
      Storage.set('rss', 'nprTextMode', e.target.checked);
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
    const bgImage = dataUrl || url || DEFAULT_WALLPAPER;

    desktop.style.backgroundImage = `url("${bgImage}")`;
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

        // Clear existing dumbos:* keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith('dumbos:')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Import all keys from backup
        for (const [key, value] of Object.entries(importObj.data)) {
          if (key.startsWith('dumbos:')) {
            localStorage.setItem(key, value);
          }
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
  const bgImage = dataUrl || url || DEFAULT_WALLPAPER;

  desktop.style.backgroundImage = `url("${bgImage}")`;
  desktop.style.backgroundSize = 'cover';
  desktop.style.backgroundPosition = 'center';
});

export default SettingsModule;
