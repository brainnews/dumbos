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
