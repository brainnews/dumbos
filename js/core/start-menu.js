/**
 * StartMenu - Windows-style flyout menu for launching apps
 */
import ModuleRegistry from './module-registry.js';
import Storage from './storage.js';
import ContextMenu from './context-menu.js';

// Category display names and order
const CATEGORY_CONFIG = {
  productivity: { name: 'Productivity', order: 1 },
  tools: { name: 'Tools', order: 2 },
  games: { name: 'Games', order: 3 },
  entertainment: { name: 'Entertainment', order: 4 },
  system: { name: 'System', order: 5 },
  custom: { name: 'Custom Apps', order: 6 }
};

class StartMenu {
  constructor() {
    this.menuEl = null;
    this.isOpen = false;
    this.expandedCategory = null;
    this.pinnedStart = [];
    this._onClickOutside = this._onClickOutside.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  /**
   * Initialize the start menu
   */
  init() {
    this._loadPinned();
    this._createMenu();
    this._setupEventListeners();
  }

  /**
   * Load pinned apps from storage
   */
  _loadPinned() {
    this.pinnedStart = Storage.get('launcher', 'pinnedStart', ['notes', 'browser', 'codeeditor', 'rss']);
  }

  /**
   * Save pinned apps to storage
   */
  _savePinned() {
    Storage.set('launcher', 'pinnedStart', this.pinnedStart);
  }

  /**
   * Create the start menu DOM element
   */
  _createMenu() {
    this.menuEl = document.createElement('div');
    this.menuEl.className = 'start-menu';
    this.menuEl.style.display = 'none';
    document.body.appendChild(this.menuEl);
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    document.addEventListener('keydown', this._onKeyDown);

    // Listen for module registration changes to update menu dynamically
    window.addEventListener('module-registered', () => {
      if (this.isOpen) {
        this._buildContent();
      }
    });

    window.addEventListener('module-unregistered', () => {
      if (this.isOpen) {
        this._buildContent();
      }
    });
  }

  /**
   * Build the menu content
   */
  _buildContent() {
    const modules = ModuleRegistry.getAll();

    this.menuEl.innerHTML = `
      <div class="start-menu-search">
        <input type="text" class="start-menu-search-input" placeholder="Search apps...">
      </div>
      <div class="start-menu-section">
        <div class="start-menu-section-title">Pinned</div>
        <div class="start-menu-pinned"></div>
      </div>
      <div class="start-menu-divider"></div>
      <div class="start-menu-section">
        <div class="start-menu-section-title">All Apps</div>
        <div class="start-menu-categories"></div>
      </div>
      <div class="start-menu-search-results" style="display: none;"></div>
    `;

    // Render pinned apps
    this._renderPinned();

    // Render categories
    this._renderCategories();

    // Setup search
    const searchInput = this.menuEl.querySelector('.start-menu-search-input');
    searchInput.addEventListener('input', (e) => this._handleSearch(e.target.value));
  }

  /**
   * Render pinned apps section
   */
  _renderPinned() {
    const container = this.menuEl.querySelector('.start-menu-pinned');
    container.innerHTML = '';

    this.pinnedStart.forEach(moduleId => {
      const module = ModuleRegistry.get(moduleId);
      if (!module) return;

      const item = this._createAppItem(module, true);
      container.appendChild(item);
    });
  }

  /**
   * Render categories with accordion
   */
  _renderCategories() {
    const container = this.menuEl.querySelector('.start-menu-categories');
    container.innerHTML = '';

    const categories = ModuleRegistry.getCategories();

    // Sort categories by configured order
    const sortedCategories = Object.keys(categories).sort((a, b) => {
      const orderA = CATEGORY_CONFIG[a]?.order || 99;
      const orderB = CATEGORY_CONFIG[b]?.order || 99;
      return orderA - orderB;
    });

    sortedCategories.forEach(categoryKey => {
      const categoryModules = categories[categoryKey];
      const config = CATEGORY_CONFIG[categoryKey] || { name: categoryKey, order: 99 };

      const categoryEl = document.createElement('div');
      categoryEl.className = 'start-menu-category';

      const header = document.createElement('button');
      header.className = 'start-menu-category-header';
      header.innerHTML = `
        <span class="start-menu-category-arrow">▸</span>
        <span>${config.name}</span>
        <span class="start-menu-category-count">${categoryModules.length}</span>
      `;

      header.addEventListener('click', () => {
        const isExpanded = categoryEl.classList.contains('expanded');
        // Collapse all categories
        container.querySelectorAll('.start-menu-category').forEach(c => c.classList.remove('expanded'));
        // Expand clicked one if it wasn't already expanded
        if (!isExpanded) {
          categoryEl.classList.add('expanded');
          this.expandedCategory = categoryKey;
        } else {
          this.expandedCategory = null;
        }
      });

      const content = document.createElement('div');
      content.className = 'start-menu-category-content';

      categoryModules.forEach(module => {
        const item = this._createAppItem(module, false);
        content.appendChild(item);
      });

      categoryEl.appendChild(header);
      categoryEl.appendChild(content);
      container.appendChild(categoryEl);

      // Restore expanded state
      if (this.expandedCategory === categoryKey) {
        categoryEl.classList.add('expanded');
      }
    });
  }

  /**
   * Create an app item element
   */
  _createAppItem(module, isPinned) {
    const item = document.createElement('button');
    item.className = 'start-menu-app';
    item.dataset.moduleId = module.id;

    const iconHtml = module.icon.startsWith('<') ? module.icon : `<span class="start-menu-app-emoji">${module.icon}</span>`;

    item.innerHTML = `
      <span class="start-menu-app-icon">${iconHtml}</span>
      <span class="start-menu-app-title">${module.title}</span>
    `;

    // Left click to open
    item.addEventListener('click', (e) => {
      if (e.button === 0) {
        this.hide();
        window.DumbOS.openModule(module.id);
      }
    });

    // Right click for context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._showAppContextMenu(e, module, isPinned);
    });

    return item;
  }

  /**
   * Show context menu for app item
   */
  _showAppContextMenu(e, module, isPinned) {
    const pinnedTaskbar = Storage.get('launcher', 'pinnedTaskbar', ['notes', 'browser', 'settings']);
    const isTaskbarPinned = pinnedTaskbar.includes(module.id);
    const shortcuts = Storage.get('desktop', 'shortcuts', []);
    const hasShortcut = shortcuts.some(s => s.moduleId === module.id);

    const items = [
      {
        label: 'Open',
        action: () => {
          this.hide();
          window.DumbOS.openModule(module.id);
        }
      },
      { separator: true },
      {
        label: isPinned ? 'Unpin from Start' : 'Pin to Start',
        action: () => {
          if (isPinned) {
            this.pinnedStart = this.pinnedStart.filter(id => id !== module.id);
          } else {
            if (!this.pinnedStart.includes(module.id)) {
              this.pinnedStart.push(module.id);
            }
          }
          this._savePinned();
          this._renderPinned();
        }
      },
      {
        label: isTaskbarPinned ? 'Unpin from Taskbar' : 'Pin to Taskbar',
        action: () => {
          let newPinned;
          if (isTaskbarPinned) {
            newPinned = pinnedTaskbar.filter(id => id !== module.id);
          } else {
            newPinned = [...pinnedTaskbar, module.id];
          }
          Storage.set('launcher', 'pinnedTaskbar', newPinned);
          window.dispatchEvent(new CustomEvent('taskbar-pins-changed'));
        }
      },
      { separator: true },
      {
        label: hasShortcut ? 'Remove from Desktop' : 'Add to Desktop',
        action: () => {
          if (hasShortcut) {
            const newShortcuts = shortcuts.filter(s => s.moduleId !== module.id);
            Storage.set('desktop', 'shortcuts', newShortcuts);
          } else {
            const newShortcut = {
              id: Date.now().toString(),
              moduleId: module.id,
              x: 20 + (shortcuts.length % 5) * 90,
              y: 20 + Math.floor(shortcuts.length / 5) * 90
            };
            Storage.set('desktop', 'shortcuts', [...shortcuts, newShortcut]);
          }
          window.dispatchEvent(new CustomEvent('desktop-shortcuts-changed'));
        }
      }
    ];

    ContextMenu.show(e.clientX, e.clientY, items);
  }

  /**
   * Handle search input
   */
  _handleSearch(query) {
    const searchResults = this.menuEl.querySelector('.start-menu-search-results');
    const pinnedSection = this.menuEl.querySelector('.start-menu-section');
    const categoriesSection = this.menuEl.querySelectorAll('.start-menu-section')[1];
    const divider = this.menuEl.querySelector('.start-menu-divider');

    query = query.trim().toLowerCase();

    if (!query) {
      searchResults.style.display = 'none';
      pinnedSection.style.display = '';
      categoriesSection.style.display = '';
      divider.style.display = '';
      return;
    }

    // Hide regular sections, show search results
    pinnedSection.style.display = 'none';
    categoriesSection.style.display = 'none';
    divider.style.display = 'none';
    searchResults.style.display = 'block';
    searchResults.innerHTML = '';

    const modules = ModuleRegistry.getAll();
    const matches = modules.filter(m =>
      m.title.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="start-menu-no-results">No apps found</div>';
      return;
    }

    matches.forEach(module => {
      const item = this._createAppItem(module, this.pinnedStart.includes(module.id));
      searchResults.appendChild(item);
    });
  }

  /**
   * Toggle menu visibility
   */
  toggle() {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Show the start menu
   */
  show() {
    this._buildContent();
    this.menuEl.style.display = 'block';
    this.isOpen = true;

    // Position above taskbar, aligned to start button
    const taskbarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--taskbar-height')) || 48;
    this.menuEl.style.bottom = `${taskbarHeight + 8}px`;
    this.menuEl.style.left = '8px';

    // Focus search input
    setTimeout(() => {
      const searchInput = this.menuEl.querySelector('.start-menu-search-input');
      if (searchInput) searchInput.focus();
    }, 50);

    // Add click outside listener
    setTimeout(() => {
      document.addEventListener('click', this._onClickOutside);
    }, 0);
  }

  /**
   * Hide the start menu
   */
  hide() {
    this.menuEl.style.display = 'none';
    this.isOpen = false;
    document.removeEventListener('click', this._onClickOutside);
  }

  /**
   * Handle click outside
   */
  _onClickOutside(e) {
    // Don't close if clicking on context menu
    if (ContextMenu.isVisible()) return;

    // Don't close if clicking on start button
    if (e.target.closest('.taskbar-start-btn')) return;

    if (!this.menuEl.contains(e.target)) {
      this.hide();
    }
  }

  /**
   * Handle keyboard events
   */
  _onKeyDown(e) {
    if (e.key === 'Escape' && this.isOpen) {
      this.hide();
    }
  }
}

export default new StartMenu();
