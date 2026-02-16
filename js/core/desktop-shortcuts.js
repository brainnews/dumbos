/**
 * DesktopShortcuts - Manage desktop shortcut icons
 */
import ModuleRegistry from './module-registry.js';
import Storage from './storage.js';
import ContextMenu from './context-menu.js';

const GRID_SPACING_X = 90;
const GRID_SPACING_Y = 100;
const GRID_START_X = 20;
const GRID_START_Y = 20;

class DesktopShortcuts {
  constructor() {
    this.container = null;
    this.shortcuts = [];
    this.dragging = null;
    this.dragOffset = { x: 0, y: 0 };
    this._onShortcutsChanged = this._onShortcutsChanged.bind(this);
  }

  /**
   * Initialize desktop shortcuts
   * @param {HTMLElement} desktop - The desktop container element
   */
  init(desktop) {
    this.container = desktop;
    this._loadShortcuts();
    this._render();
    this._setupEventListeners();
    this._setupDesktopContextMenu();
  }

  /**
   * Load shortcuts from storage
   */
  _loadShortcuts() {
    this.shortcuts = Storage.get('desktop', 'shortcuts', []);
  }

  /**
   * Save shortcuts to storage
   */
  _saveShortcuts() {
    Storage.set('desktop', 'shortcuts', this.shortcuts);
  }

  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    window.addEventListener('desktop-shortcuts-changed', this._onShortcutsChanged);
  }

  /**
   * Handle shortcuts changed event
   */
  _onShortcutsChanged() {
    this._loadShortcuts();
    this._render();
  }

  /**
   * Render all shortcuts
   */
  _render() {
    // Remove existing shortcut elements
    this.container.querySelectorAll('.desktop-shortcut').forEach(el => el.remove());

    this.shortcuts.forEach(shortcut => {
      const module = ModuleRegistry.get(shortcut.moduleId);
      if (!module) return;

      const el = this._createShortcutElement(shortcut, module);
      this.container.appendChild(el);
    });
  }

  /**
   * Create a shortcut DOM element
   */
  _createShortcutElement(shortcut, module) {
    const el = document.createElement('div');
    el.className = 'desktop-shortcut';
    el.dataset.shortcutId = shortcut.id;
    el.style.left = `${shortcut.x}px`;
    el.style.top = `${shortcut.y}px`;

    // Sanitize icon: only allow SVG tags or treat as emoji text
    let iconHtml;
    if (module.icon && module.icon.trimStart().startsWith('<svg')) {
      iconHtml = module.icon;
    } else {
      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'desktop-shortcut-emoji';
      emojiSpan.textContent = module.icon || '';
      iconHtml = emojiSpan.outerHTML;
    }

    const iconDiv = document.createElement('div');
    iconDiv.className = 'desktop-shortcut-icon';
    iconDiv.innerHTML = iconHtml;

    const labelDiv = document.createElement('div');
    labelDiv.className = 'desktop-shortcut-label';
    labelDiv.textContent = module.title;

    el.appendChild(iconDiv);
    el.appendChild(labelDiv);

    // Double-click to open
    el.addEventListener('dblclick', () => {
      window.DumbOS.openModule(module.id);
    });

    // Right-click context menu
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._showContextMenu(e, shortcut, module);
    });

    // Drag functionality
    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this._startDrag(e, el, shortcut);
    });

    return el;
  }

  /**
   * Start dragging a shortcut
   */
  _startDrag(e, el, shortcut) {
    e.preventDefault();
    this.dragging = { el, shortcut };

    const rect = el.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    el.classList.add('dragging');

    const onMouseMove = (e) => {
      if (!this.dragging) return;

      const containerRect = this.container.getBoundingClientRect();
      let newX = e.clientX - containerRect.left - this.dragOffset.x;
      let newY = e.clientY - containerRect.top - this.dragOffset.y;

      // Constrain to desktop bounds
      newX = Math.max(0, Math.min(newX, containerRect.width - 80));
      newY = Math.max(0, Math.min(newY, containerRect.height - 80));

      el.style.left = `${newX}px`;
      el.style.top = `${newY}px`;
    };

    const onMouseUp = (e) => {
      if (!this.dragging) return;

      const containerRect = this.container.getBoundingClientRect();
      let newX = e.clientX - containerRect.left - this.dragOffset.x;
      let newY = e.clientY - containerRect.top - this.dragOffset.y;

      // Constrain to desktop bounds
      newX = Math.max(0, Math.min(newX, containerRect.width - 80));
      newY = Math.max(0, Math.min(newY, containerRect.height - 80));

      // Update shortcut position
      shortcut.x = newX;
      shortcut.y = newY;
      this._saveShortcuts();

      el.classList.remove('dragging');
      this.dragging = null;

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  /**
   * Show context menu for shortcut
   */
  _showContextMenu(e, shortcut, module) {
    const pinnedTaskbar = Storage.get('launcher', 'pinnedTaskbar', ['notes', 'browser', 'settings']);
    const isTaskbarPinned = pinnedTaskbar.includes(module.id);

    const items = [
      {
        label: 'Open',
        action: () => {
          window.DumbOS.openModule(module.id);
        }
      },
      { separator: true },
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
        label: 'Remove from Desktop',
        action: () => {
          this.shortcuts = this.shortcuts.filter(s => s.id !== shortcut.id);
          this._saveShortcuts();
          this._render();
        }
      }
    ];

    ContextMenu.show(e.clientX, e.clientY, items);
  }

  /**
   * Add a shortcut for a module
   */
  addShortcut(moduleId) {
    const module = ModuleRegistry.get(moduleId);
    if (!module) return;

    // Check if shortcut already exists
    if (this.shortcuts.some(s => s.moduleId === moduleId)) return;

    const { x, y } = this.getNextGridPosition();

    const shortcut = {
      id: Date.now().toString(),
      moduleId,
      x,
      y
    };

    this.shortcuts.push(shortcut);
    this._saveShortcuts();
    this._render();
  }

  /**
   * Get all occupied grid positions from shortcuts and bookmarks
   */
  _getOccupiedPositions() {
    const occupied = new Set();

    // Add shortcut positions
    this.shortcuts.forEach(s => {
      const col = Math.round((s.x - GRID_START_X) / GRID_SPACING_X);
      const row = Math.round((s.y - GRID_START_Y) / GRID_SPACING_Y);
      occupied.add(`${col},${row}`);
    });

    // Add bookmark positions
    const bookmarks = Storage.get('bookmarks', 'list', []);
    const showOnDesktop = Storage.get('bookmarks', 'showOnDesktop', false);
    if (showOnDesktop) {
      bookmarks.forEach(b => {
        if (b.x !== undefined && b.y !== undefined) {
          const col = Math.round((b.x - GRID_START_X) / GRID_SPACING_X);
          const row = Math.round((b.y - GRID_START_Y) / GRID_SPACING_Y);
          occupied.add(`${col},${row}`);
        }
      });
    }

    return occupied;
  }

  /**
   * Find the next available grid position
   */
  getNextGridPosition() {
    const containerRect = this.container.getBoundingClientRect();
    const maxRows = Math.floor((containerRect.height - 60) / GRID_SPACING_Y);
    const occupied = this._getOccupiedPositions();

    // Search for first available position (column by column, top to bottom)
    for (let col = 0; col < 100; col++) {
      for (let row = 0; row < maxRows; row++) {
        if (!occupied.has(`${col},${row}`)) {
          return {
            x: GRID_START_X + (col * GRID_SPACING_X),
            y: GRID_START_Y + (row * GRID_SPACING_Y)
          };
        }
      }
    }

    // Fallback if somehow all positions are taken
    return { x: GRID_START_X, y: GRID_START_Y };
  }

  /**
   * Remove a shortcut by module ID
   */
  removeShortcut(moduleId) {
    this.shortcuts = this.shortcuts.filter(s => s.moduleId !== moduleId);
    this._saveShortcuts();
    this._render();
  }

  /**
   * Setup context menu for desktop background
   */
  _setupDesktopContextMenu() {
    this.container.addEventListener('contextmenu', (e) => {
      // Only show desktop menu if clicking on the desktop background, not on shortcuts or windows
      if (!e.target.closest('.desktop-shortcut') && !e.target.closest('.window')) {
        e.preventDefault();
        this._showDesktopContextMenu(e);
      }
    });
  }

  /**
   * Show desktop context menu
   */
  _showDesktopContextMenu(e) {
    const items = [
      {
        label: 'Change Wallpaper',
        action: () => {
          window.DumbOS.openModule('settings');
        }
      },
      { separator: true },
      {
        label: 'Clean Up Desktop',
        action: () => {
          this.cleanUpShortcuts();
        }
      }
    ];

    ContextMenu.show(e.clientX, e.clientY, items);
  }

  /**
   * Realign all desktop icons (shortcuts and bookmarks) to a grid
   */
  cleanUpShortcuts() {
    const containerRect = this.container.getBoundingClientRect();
    const maxRows = Math.floor((containerRect.height - 60) / GRID_SPACING_Y); // Leave room for taskbar
    let index = 0;

    // Clean up module shortcuts
    this.shortcuts.forEach((shortcut) => {
      const col = Math.floor(index / maxRows);
      const row = index % maxRows;
      shortcut.x = GRID_START_X + (col * GRID_SPACING_X);
      shortcut.y = GRID_START_Y + (row * GRID_SPACING_Y);
      index++;
    });

    this._saveShortcuts();
    this._render();

    // Clean up desktop bookmarks
    this._cleanUpBookmarks(index, maxRows);
  }

  /**
   * Realign desktop bookmarks to the grid, continuing from a given index
   */
  _cleanUpBookmarks(startIndex, maxRows) {
    const bookmarks = Storage.get('bookmarks', 'list', []);
    const showOnDesktop = Storage.get('bookmarks', 'showOnDesktop', false);

    if (!showOnDesktop || bookmarks.length === 0) return;

    let index = startIndex;
    bookmarks.forEach((bookmark) => {
      const col = Math.floor(index / maxRows);
      const row = index % maxRows;
      bookmark.x = GRID_START_X + (col * GRID_SPACING_X);
      bookmark.y = GRID_START_Y + (row * GRID_SPACING_Y);
      index++;
    });

    // Save updated bookmark positions
    Storage.set('bookmarks', 'list', bookmarks);

    // Re-render desktop bookmarks
    this._rerenderDesktopBookmarks(bookmarks);
  }

  /**
   * Re-render desktop bookmark elements with updated positions
   */
  _rerenderDesktopBookmarks(bookmarks) {
    const existingBookmarks = this.container.querySelectorAll('.desktop-bookmark');
    existingBookmarks.forEach((el, i) => {
      if (bookmarks[i]) {
        el.style.left = `${bookmarks[i].x}px`;
        el.style.top = `${bookmarks[i].y}px`;
      }
    });
  }
}

export default new DesktopShortcuts();
