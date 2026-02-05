/**
 * DumbOS - Main Application Bootstrap
 */
import Storage from './storage.js';
import WindowManager from './window-manager.js';
import ModuleRegistry from './module-registry.js';
import Taskbar from './taskbar.js';
import ContextMenu from './context-menu.js';
import StartMenu from './start-menu.js';
import DesktopShortcuts from './desktop-shortcuts.js';

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
import BubbleWrapModule from '../modules/bubblewrap/bubblewrap.js';
import PixelArtModule from '../modules/pixelart/pixelart.js';
import NonogramModule from '../modules/nonogram/nonogram.js';
import BrowserModule from '../modules/browser/browser.js';
import YouTubeModule from '../modules/youtube/youtube.js';
import WritingModule from '../modules/writing/writing.js';
import PhotoEditorModule from '../modules/photoeditor/photoeditor.js';
import HelpModule from '../modules/help/help.js';
import SynthModule from '../modules/synth/synth.js';
import StockTrackerModule from '../modules/stocktracker/stocktracker.js';
import AppBuilderModule, { registerCustomApps } from '../modules/appbuilder/appbuilder.js';
import StoryModeModule from '../modules/storymode/storymode.js';
import Screensaver from './screensaver.js';

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
    ContextMenu.init();

    // Register modules first (needed by other systems)
    this._registerModules();

    // Initialize UI systems that depend on modules
    StartMenu.init();
    DesktopShortcuts.init(this.desktop);
    Taskbar.init();

    // Initialize screensaver system
    Screensaver.init();

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

    // Populate categories dynamically
    this._populateWelcomeCategories();

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
   * Populate welcome modal with app categories
   */
  _populateWelcomeCategories() {
    const container = document.querySelector('.welcome-categories');
    if (!container) return;

    const modules = ModuleRegistry.getAll();
    const categoryNames = {
      productivity: 'Productivity',
      entertainment: 'Entertainment',
      games: 'Games',
      tools: 'Tools',
      system: 'System',
      custom: 'Custom Apps'
    };

    // Group modules by category
    const categories = {};
    modules.forEach(module => {
      const cat = module.category || 'other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(module.title);
    });

    // Render categories in a specific order
    const order = ['productivity', 'entertainment', 'games', 'tools', 'system', 'custom'];
    container.innerHTML = order
      .filter(cat => categories[cat]?.length > 0)
      .map(cat => `
        <div class="welcome-category">
          <div class="welcome-category-title">${categoryNames[cat] || cat}</div>
          <div class="welcome-category-apps">${categories[cat].join(', ')}</div>
        </div>
      `).join('');
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
    ModuleRegistry.register(BrowserModule);
    ModuleRegistry.register(YouTubeModule);
    ModuleRegistry.register(BubbleWrapModule);
    ModuleRegistry.register(PixelArtModule);
    ModuleRegistry.register(NonogramModule);
    ModuleRegistry.register(WritingModule);
    ModuleRegistry.register(PhotoEditorModule);
    ModuleRegistry.register(HelpModule);
    ModuleRegistry.register(SynthModule);
    ModuleRegistry.register(StockTrackerModule);
    ModuleRegistry.register(AppBuilderModule);
    ModuleRegistry.register(StoryModeModule);
    ModuleRegistry.register(SettingsModule);

    // Register user-created apps from App Builder
    registerCustomApps();
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
