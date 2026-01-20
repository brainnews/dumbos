/**
 * Taskbar - Bottom taskbar controller
 */
import ModuleRegistry from './module-registry.js';
import WindowManager from './window-manager.js';
import Storage from './storage.js';

class Taskbar {
  constructor() {
    this.taskbarEl = null;
    this.launchersEl = null;
    this.trayEl = null;
    this.clockEl = null;
    this.clockIntervalId = null;
  }

  /**
   * Initialize the taskbar
   */
  init() {
    this.taskbarEl = document.getElementById('taskbar');
    this.launchersEl = this.taskbarEl.querySelector('.taskbar-launchers');
    this.trayEl = this.taskbarEl.querySelector('.taskbar-tray');

    this._setupEventListeners();
    this._buildLaunchers();
    this._buildTray();
  }

  /**
   * Setup event listeners for window events
   */
  _setupEventListeners() {
    window.addEventListener('window-opened', (e) => this._updateLauncherState(e.detail.windowId));
    window.addEventListener('window-closed', (e) => this._updateLauncherState(e.detail.windowId));
    window.addEventListener('window-minimized', (e) => this._updateLauncherState(e.detail.windowId));
    window.addEventListener('window-restored', (e) => this._updateLauncherState(e.detail.windowId));
    window.addEventListener('settings-changed', (e) => {
      if (e.detail.key === 'clock-format') {
        this._updateClock();
      }
    });
  }

  /**
   * Build launcher buttons for all modules
   */
  _buildLaunchers() {
    // Use setTimeout to ensure modules are registered
    setTimeout(() => {
      const modules = ModuleRegistry.getAll();

      modules.forEach(module => {
        const launcher = document.createElement('button');
        launcher.className = 'taskbar-launcher';
        launcher.dataset.moduleId = module.id;
        launcher.title = module.title;
        launcher.innerHTML = module.icon || '';

        launcher.addEventListener('click', () => {
          this._handleLauncherClick(module.id);
        });

        this.launchersEl.appendChild(launcher);
      });
    }, 0);
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
