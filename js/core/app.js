/**
 * DumbOS - Main Application Bootstrap
 */
import Storage from './storage.js';
import WindowManager from './window-manager.js';
import ModuleRegistry from './module-registry.js';
import Taskbar from './taskbar.js';

// Import modules
import NotesModule from '../modules/notes/notes.js';
import RSSModule from '../modules/rss/rss.js';
import SettingsModule from '../modules/settings/settings.js';
import PomodoroModule from '../modules/pomodoro/pomodoro.js';
import BookmarksModule from '../modules/bookmarks/bookmarks.js';
import SysInfoModule from '../modules/sysinfo/sysinfo.js';
import MetMuseumModule from '../modules/metmuseum/metmuseum.js';
import BreakoutModule from '../modules/breakout/breakout.js';
import SnakeModule from '../modules/snake/snake.js';
import CodeEditorModule from '../modules/codeeditor/codeeditor.js';

class App {
  constructor() {
    this.desktop = null;
  }

  /**
   * Initialize the application
   */
  init() {
    this.desktop = document.getElementById('desktop');

    // Initialize core systems
    WindowManager.init(this.desktop);
    Taskbar.init();

    // Register modules
    this._registerModules();

    // Restore previously open windows or show defaults
    this._restoreWindows();

    // Show welcome modal on first visit
    this._showWelcome();
  }

  /**
   * Show welcome modal if user hasn't dismissed it
   */
  _showWelcome() {
    const hideWelcome = Storage.get('app', 'hideWelcome', false);
    if (hideWelcome) return;

    const modal = document.getElementById('welcome-modal');
    const closeBtn = modal.querySelector('.welcome-close');
    const checkbox = document.getElementById('welcome-hide');

    modal.style.display = 'flex';

    const close = () => {
      if (checkbox.checked) {
        Storage.set('app', 'hideWelcome', true);
      }
      modal.style.display = 'none';
    };

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
  }

  /**
   * Register all available modules
   */
  _registerModules() {
    ModuleRegistry.register(NotesModule);
    ModuleRegistry.register(RSSModule);
    ModuleRegistry.register(PomodoroModule);
    ModuleRegistry.register(BookmarksModule);
    ModuleRegistry.register(SysInfoModule);
    ModuleRegistry.register(MetMuseumModule);
    ModuleRegistry.register(BreakoutModule);
    ModuleRegistry.register(SnakeModule);
    ModuleRegistry.register(CodeEditorModule);
    ModuleRegistry.register(SettingsModule);
  }

  /**
   * Restore windows that were open in the last session
   */
  _restoreWindows() {
    const modules = ModuleRegistry.getAll();
    let anyRestored = false;

    modules.forEach(module => {
      if (WindowManager.wasOpen(module.id)) {
        this.openModule(module.id);
        anyRestored = true;
      }
    });

    // Only open notes by default on fresh install (no window state saved yet)
    // If user closed all windows, respect that choice
    if (!anyRestored) {
      const hasWindowState = Storage.keys('windows').length > 0;
      if (!hasWindowState) {
        this.openModule('notes');
      }
    }
  }

  /**
   * Open a module window
   */
  openModule(moduleId) {
    const module = ModuleRegistry.get(moduleId);
    if (!module) {
      console.error(`Module ${moduleId} not found`);
      return;
    }

    // Check if already open
    if (WindowManager.isOpen(moduleId)) {
      const windowData = WindowManager.getWindow(moduleId);
      if (windowData.state.minimized) {
        WindowManager.restore(moduleId);
      } else {
        // Bring to front
        WindowManager._bringToFront(moduleId);
      }
      return;
    }

    // Create window
    const windowData = WindowManager.createWindow(module);

    // Initialize module
    if (module.init) {
      module.init(windowData.contentEl, Storage.module(moduleId));
    }

    // Render module content
    if (module.render) {
      module.render();
    }

    // Notify taskbar
    window.dispatchEvent(new CustomEvent('window-opened', { detail: { windowId: moduleId } }));
  }
}

// Initialize app when DOM is ready
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());

// Export for external use
window.DumbOS = {
  openModule: (id) => app.openModule(id),
  getModules: () => ModuleRegistry.getAll()
};

export default app;
