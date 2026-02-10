/**
 * Taskbar - Bottom taskbar controller with Start menu integration
 */
import ModuleRegistry from './module-registry.js';
import WindowManager from './window-manager.js';
import Storage from './storage.js';
import StartMenu from './start-menu.js';
import ContextMenu from './context-menu.js';

const DEFAULT_PINNED = ['notes', 'browser', 'settings'];

class Taskbar {
  constructor() {
    this.taskbarEl = null;
    this.startBtnEl = null;
    this.launchersEl = null;
    this.trayEl = null;
    this.clockEl = null;
    this.clockIntervalId = null;
    this.pinnedTaskbar = [];
    this.openApps = new Set();
  }

  /**
   * Initialize the taskbar
   */
  init() {
    this.taskbarEl = document.getElementById('taskbar');
    this.launchersEl = this.taskbarEl.querySelector('.taskbar-launchers');
    this.trayEl = this.taskbarEl.querySelector('.taskbar-tray');

    this._loadPinned();
    this._setupEventListeners();
    this._buildStartButton();
    this._buildLaunchers();
    this._buildLauncherInput();
    this._buildTray();
  }

  /**
   * Load pinned apps from storage
   */
  _loadPinned() {
    this.pinnedTaskbar = Storage.get('launcher', 'pinnedTaskbar', DEFAULT_PINNED);
  }

  /**
   * Save pinned apps to storage
   */
  _savePinned() {
    Storage.set('launcher', 'pinnedTaskbar', this.pinnedTaskbar);
  }

  /**
   * Setup event listeners for window events
   */
  _setupEventListeners() {
    window.addEventListener('window-opened', (e) => this._onWindowOpened(e.detail.windowId));
    window.addEventListener('window-closed', (e) => this._onWindowClosed(e.detail.windowId));
    window.addEventListener('window-minimized', (e) => this._updateLauncherState(e.detail.windowId));
    window.addEventListener('window-restored', (e) => this._updateLauncherState(e.detail.windowId));
    window.addEventListener('settings-changed', (e) => {
      if (e.detail.key === 'clock-format') {
        this._updateClock();
      }
    });
    window.addEventListener('taskbar-pins-changed', () => {
      this._loadPinned();
      this._rebuildLaunchers();
    });
  }

  /**
   * Build the Start button
   */
  _buildStartButton() {
    this.startBtnEl = document.createElement('button');
    this.startBtnEl.className = 'taskbar-start-btn';
    this.startBtnEl.title = 'Start';
    this.startBtnEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      </svg>
    `;

    this.startBtnEl.addEventListener('click', () => {
      StartMenu.toggle();
    });

    this.launchersEl.parentNode.insertBefore(this.startBtnEl, this.launchersEl);
  }

  /**
   * Build launcher buttons for pinned and open apps
   */
  _buildLaunchers() {
    // Use setTimeout to ensure modules are registered
    setTimeout(() => {
      this._rebuildLaunchers();
    }, 0);
  }

  /**
   * Rebuild launchers (pinned + open non-pinned apps)
   */
  _rebuildLaunchers() {
    this.launchersEl.innerHTML = '';

    // Add pinned apps
    this.pinnedTaskbar.forEach(moduleId => {
      const module = ModuleRegistry.get(moduleId);
      if (!module) return;
      this._createLauncher(module, true);
    });

    // Add open but non-pinned apps
    this.openApps.forEach(moduleId => {
      if (this.pinnedTaskbar.includes(moduleId)) return;
      const module = ModuleRegistry.get(moduleId);
      if (!module) return;
      this._createLauncher(module, false);
    });

    // Update states for open windows
    this.openApps.forEach(moduleId => {
      this._updateLauncherState(moduleId);
    });
  }

  /**
   * Create a launcher button
   */
  _createLauncher(module, isPinned) {
    const launcher = document.createElement('button');
    launcher.className = 'taskbar-launcher';
    launcher.dataset.moduleId = module.id;
    launcher.dataset.pinned = isPinned ? 'true' : 'false';
    launcher.title = module.title;
    launcher.innerHTML = module.icon || '';

    launcher.addEventListener('click', () => {
      this._handleLauncherClick(module.id);
    });

    launcher.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._showLauncherContextMenu(e, module, isPinned);
    });

    this.launchersEl.appendChild(launcher);
  }

  /**
   * Show context menu for launcher
   */
  _showLauncherContextMenu(e, module, isPinned) {
    const windowData = WindowManager.getWindow(module.id);
    const isOpen = !!windowData;

    const items = [];

    if (isOpen) {
      items.push({
        label: windowData.state.minimized ? 'Restore' : 'Minimize',
        action: () => {
          if (windowData.state.minimized) {
            WindowManager.restore(module.id);
          } else {
            WindowManager.minimize(module.id);
          }
        }
      });
      items.push({
        label: 'Close',
        action: () => {
          WindowManager.close(module.id);
        }
      });
      items.push({ separator: true });
    }

    items.push({
      label: isPinned ? 'Unpin from Taskbar' : 'Pin to Taskbar',
      action: () => {
        if (isPinned) {
          this.pinnedTaskbar = this.pinnedTaskbar.filter(id => id !== module.id);
        } else {
          this.pinnedTaskbar.push(module.id);
        }
        this._savePinned();
        this._rebuildLaunchers();
      }
    });

    ContextMenu.show(e.clientX, e.clientY, items);
  }

  /**
   * Handle window opened event
   */
  _onWindowOpened(moduleId) {
    this.openApps.add(moduleId);

    // If not pinned, add launcher
    if (!this.pinnedTaskbar.includes(moduleId)) {
      const module = ModuleRegistry.get(moduleId);
      if (module) {
        this._createLauncher(module, false);
      }
    }

    this._updateLauncherState(moduleId);
  }

  /**
   * Handle window closed event
   */
  _onWindowClosed(moduleId) {
    this.openApps.delete(moduleId);

    // If not pinned, remove launcher
    if (!this.pinnedTaskbar.includes(moduleId)) {
      const launcher = this.launchersEl.querySelector(`[data-module-id="${moduleId}"]`);
      if (launcher) {
        launcher.remove();
      }
    } else {
      this._updateLauncherState(moduleId);
    }
  }

  /**
   * Handle launcher click - open, restore, or minimize
   */
  _handleLauncherClick(moduleId) {
    const windowData = WindowManager.getWindow(moduleId);

    if (!windowData) {
      // Not open, open it
      window.DumbOS.openModule(moduleId);
    } else if (windowData.state.minimized) {
      // Minimized, restore it
      WindowManager.restore(moduleId);
    } else {
      // Open and not minimized, minimize it
      WindowManager.minimize(moduleId);
    }
  }

  /**
   * Update launcher button state based on window state
   */
  _updateLauncherState(moduleId) {
    const launcher = this.launchersEl.querySelector(`[data-module-id="${moduleId}"]`);
    if (!launcher) return;

    const windowData = WindowManager.getWindow(moduleId);

    if (!windowData) {
      // Window closed
      launcher.classList.remove('active', 'minimized');
    } else if (windowData.state.minimized) {
      // Window minimized
      launcher.classList.add('active', 'minimized');
    } else {
      // Window open and visible
      launcher.classList.add('active');
      launcher.classList.remove('minimized');
    }
  }

  /**
   * Build the launcher input (URL bar / search)
   */
  _buildLauncherInput() {
    this.launcherWrapperEl = document.createElement('div');
    this.launcherWrapperEl.className = 'taskbar-launcher-input';

    this.launcherInputEl = document.createElement('input');
    this.launcherInputEl.type = 'text';
    this.launcherInputEl.placeholder = 'Search or enter URL...';

    this.launcherDropdownEl = document.createElement('div');
    this.launcherDropdownEl.className = 'taskbar-launcher-dropdown';

    this.launcherWrapperEl.appendChild(this.launcherInputEl);
    this.launcherWrapperEl.appendChild(this.launcherDropdownEl);
    this.taskbarEl.insertBefore(this.launcherWrapperEl, this.trayEl);

    this.dropdownSelectedIndex = -1;

    this.launcherInputEl.addEventListener('focus', () => {
      this._renderDropdown(this.launcherInputEl.value);
    });

    this.launcherInputEl.addEventListener('input', () => {
      this.dropdownSelectedIndex = -1;
      this._renderDropdown(this.launcherInputEl.value);
    });

    this.launcherInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.dropdownSelectedIndex >= 0) {
          const items = this.launcherDropdownEl.querySelectorAll('.taskbar-launcher-dropdown-item');
          if (items[this.dropdownSelectedIndex]) {
            items[this.dropdownSelectedIndex].click();
            return;
          }
        }
        const query = this.launcherInputEl.value.trim();
        if (query) {
          this._launch(query);
        }
      } else if (e.key === 'Escape') {
        this.launcherInputEl.value = '';
        this.launcherInputEl.blur();
        this._hideDropdown();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = this.launcherDropdownEl.querySelectorAll('.taskbar-launcher-dropdown-item');
        if (items.length === 0) return;
        if (e.key === 'ArrowUp') {
          // Move up into dropdown (start from bottom item, closest to input)
          if (this.dropdownSelectedIndex === -1) {
            this.dropdownSelectedIndex = items.length - 1;
          } else {
            this.dropdownSelectedIndex = Math.max(this.dropdownSelectedIndex - 1, 0);
          }
        } else {
          // ArrowDown moves back toward input
          if (this.dropdownSelectedIndex === -1) return;
          this.dropdownSelectedIndex++;
          if (this.dropdownSelectedIndex >= items.length) {
            this.dropdownSelectedIndex = -1;
          }
        }
        items.forEach((item, i) => {
          item.classList.toggle('selected', i === this.dropdownSelectedIndex);
        });
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.launcherWrapperEl.contains(e.target)) {
        this._hideDropdown();
      }
    });
  }

  /**
   * Check if input looks like a URL
   */
  _isUrl(input) {
    return /^(https?:\/\/)?[^\s]+\.[a-z]{2,}/i.test(input.trim());
  }

  /**
   * Launch a query as URL or search
   */
  _launch(query) {
    const isUrl = this._isUrl(query);
    if (isUrl) {
      let url = query.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      window.open(url, '_blank');
      this._addToHistory(query.trim(), 'url');
    } else {
      window.open('https://www.google.com/search?q=' + encodeURIComponent(query), '_blank');
      this._addToHistory(query.trim(), 'search');
    }
    this.launcherInputEl.value = '';
    this.launcherInputEl.blur();
    this._hideDropdown();
  }

  /**
   * Add entry to launcher history
   */
  _addToHistory(query, type) {
    let history = Storage.get('launcher', 'history', []);
    history = history.filter(h => h.query.toLowerCase() !== query.toLowerCase());
    history.unshift({ query, type, timestamp: Date.now() });
    if (history.length > 50) history = history.slice(0, 50);
    Storage.set('launcher', 'history', history);
  }

  /**
   * Render the dropdown with filtered history
   */
  _renderDropdown(filter) {
    const history = Storage.get('launcher', 'history', []);
    const filterText = (filter || '').trim().toLowerCase();
    const filtered = filterText
      ? history.filter(h => h.query.toLowerCase().includes(filterText))
      : history;

    if (filtered.length === 0) {
      this._hideDropdown();
      return;
    }

    this.launcherDropdownEl.innerHTML = '';
    this.dropdownSelectedIndex = -1;

    filtered.forEach(item => {
      const el = document.createElement('div');
      el.className = 'taskbar-launcher-dropdown-item';
      const icon = item.type === 'url' ? '🌐' : '🔍';
      el.innerHTML = `<span class="launcher-type-icon">${icon}</span><span class="launcher-query">${this._escapeHtml(item.query)}</span><span class="launcher-remove">&times;</span>`;
      el.querySelector('.launcher-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this._removeHistoryItem(item.query);
        this._renderDropdown(this.launcherInputEl.value);
      });
      el.addEventListener('click', () => {
        this._launch(item.query);
      });
      this.launcherDropdownEl.appendChild(el);
    });

    const clearEl = document.createElement('div');
    clearEl.className = 'taskbar-launcher-dropdown-clear';
    clearEl.textContent = 'Clear history';
    clearEl.addEventListener('click', () => {
      this._clearHistory();
    });
    this.launcherDropdownEl.appendChild(clearEl);

    this.launcherDropdownEl.classList.add('visible');
  }

  /**
   * Hide the dropdown
   */
  _hideDropdown() {
    this.launcherDropdownEl.classList.remove('visible');
  }

  /**
   * Remove a single item from launcher history
   */
  _removeHistoryItem(query) {
    let history = Storage.get('launcher', 'history', []);
    history = history.filter(h => h.query.toLowerCase() !== query.toLowerCase());
    Storage.set('launcher', 'history', history);
  }

  /**
   * Clear launcher history
   */
  _clearHistory() {
    Storage.remove('launcher', 'history');
    this._hideDropdown();
  }

  /**
   * Escape HTML for safe rendering
   */
  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Build system tray (clock)
   */
  _buildTray() {
    this.clockEl = document.createElement('div');
    this.clockEl.className = 'taskbar-clock';
    this.trayEl.appendChild(this.clockEl);

    this._updateClock();
    this.clockIntervalId = setInterval(() => this._updateClock(), 1000);
  }

  /**
   * Update the clock display based on format setting
   */
  _updateClock() {
    const now = new Date();
    const format = Storage.get('clock', 'format', '24');

    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');

    if (format === '12') {
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      this.clockEl.textContent = `${hours}:${minutes} ${period}`;
    } else {
      this.clockEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
  }
}

export default new Taskbar();
