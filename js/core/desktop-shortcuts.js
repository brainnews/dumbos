/**
 * DesktopShortcuts - Manage desktop shortcut icons
 */
import ModuleRegistry from './module-registry.js';
import Storage from './storage.js';
import ContextMenu from './context-menu.js';

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

    const iconHtml = module.icon.startsWith('<')
      ? module.icon
      : `<span class="desktop-shortcut-emoji">${module.icon}</span>`;

    el.innerHTML = `
      <div class="desktop-shortcut-icon">${iconHtml}</div>
      <div class="desktop-shortcut-label">${module.title}</div>
    `;

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
  addShortcut(moduleId, x = 20, y = 20) {
    const module = ModuleRegistry.get(moduleId);
    if (!module) return;

    // Check if shortcut already exists
    if (this.shortcuts.some(s => s.moduleId === moduleId)) return;

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
   * Remove a shortcut by module ID
   */
  removeShortcut(moduleId) {
    this.shortcuts = this.shortcuts.filter(s => s.moduleId !== moduleId);
    this._saveShortcuts();
    this._render();
  }
}

export default new DesktopShortcuts();
