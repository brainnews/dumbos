/**
 * WindowManager - Handles window creation, drag, resize, minimize, maximize, close
 */
import Storage from './storage.js';

const STORAGE_NAMESPACE = 'windows';

class WindowManager {
  constructor() {
    this.windows = new Map();
    this.desktop = null;
    this.activeWindow = null;
    this.highestZIndex = 100;
    this.dragState = null;
    this.resizeState = null;

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
  }

  /**
   * Initialize the window manager
   */
  init(desktopElement) {
    this.desktop = desktopElement;
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
  }

  /**
   * Create a new window for a module
   */
  createWindow(module) {
    const savedState = this._loadState(module.id);
    const state = {
      id: module.id,
      x: savedState?.x ?? 50 + Math.random() * 100,
      y: savedState?.y ?? 50 + Math.random() * 100,
      width: savedState?.width ?? module.defaultSize?.width ?? 400,
      height: savedState?.height ?? module.defaultSize?.height ?? 300,
      minimized: savedState?.minimized ?? false,
      maximized: savedState?.maximized ?? false,
      zIndex: this._getNextZIndex(),
      open: true
    };

    // Constrain to viewport
    const bounds = this.desktop.getBoundingClientRect();
    state.x = Math.max(0, Math.min(state.x, bounds.width - state.width));
    state.y = Math.max(0, Math.min(state.y, bounds.height - state.height));

    const windowEl = this._buildWindowElement(module, state);
    this.desktop.appendChild(windowEl);

    const windowData = {
      element: windowEl,
      module,
      state,
      contentEl: windowEl.querySelector('.window-content')
    };

    this.windows.set(module.id, windowData);
    this._applyState(windowData);
    this._bringToFront(module.id);
    this._saveState(module.id);

    return windowData;
  }

  /**
   * Build the window DOM element
   */
  _buildWindowElement(module, state) {
    const windowEl = document.createElement('div');
    windowEl.className = 'window';
    windowEl.dataset.windowId = module.id;

    windowEl.innerHTML = `
      <div class="window-header">
        <span class="window-icon">${module.icon || ''}</span>
        <span class="window-title">${module.title}</span>
        <div class="window-controls">
          <button class="window-control window-control-minimize" title="Minimize"></button>
          <button class="window-control window-control-maximize" title="Maximize"></button>
          <button class="window-control window-control-close" title="Close"></button>
        </div>
      </div>
      <div class="window-content"></div>
      <div class="window-resize"></div>
    `;

    // Event listeners
    const header = windowEl.querySelector('.window-header');
    header.addEventListener('mousedown', (e) => this._startDrag(e, module.id));
    header.addEventListener('dblclick', () => this.toggleMaximize(module.id));

    windowEl.querySelector('.window-control-close').addEventListener('click', () => this.close(module.id));
    windowEl.querySelector('.window-control-minimize').addEventListener('click', () => this.minimize(module.id));
    windowEl.querySelector('.window-control-maximize').addEventListener('click', () => this.toggleMaximize(module.id));

    windowEl.querySelector('.window-resize').addEventListener('mousedown', (e) => this._startResize(e, module.id));

    windowEl.addEventListener('mousedown', () => this._bringToFront(module.id));

    return windowEl;
  }

  /**
   * Apply state to window element
   */
  _applyState(windowData) {
    const { element, state } = windowData;

    element.style.left = `${state.x}px`;
    element.style.top = `${state.y}px`;
    element.style.width = `${state.width}px`;
    element.style.height = `${state.height}px`;
    element.style.zIndex = state.zIndex;

    element.classList.toggle('minimized', state.minimized);
    element.classList.toggle('maximized', state.maximized);
  }

  /**
   * Start dragging a window
   */
  _startDrag(e, windowId) {
    if (e.target.closest('.window-controls')) return;

    const windowData = this.windows.get(windowId);
    if (!windowData || windowData.state.maximized) return;

    e.preventDefault();
    windowData.element.classList.add('dragging');

    this.dragState = {
      windowId,
      startX: e.clientX,
      startY: e.clientY,
      windowX: windowData.state.x,
      windowY: windowData.state.y
    };
  }

  /**
   * Start resizing a window
   */
  _startResize(e, windowId) {
    const windowData = this.windows.get(windowId);
    if (!windowData || windowData.state.maximized) return;

    e.preventDefault();
    e.stopPropagation();
    windowData.element.classList.add('resizing');

    this.resizeState = {
      windowId,
      startX: e.clientX,
      startY: e.clientY,
      windowWidth: windowData.state.width,
      windowHeight: windowData.state.height
    };
  }

  /**
   * Handle mouse move for drag/resize
   */
  _onMouseMove(e) {
    if (this.dragState) {
      const { windowId, startX, startY, windowX, windowY } = this.dragState;
      const windowData = this.windows.get(windowId);
      if (!windowData) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const bounds = this.desktop.getBoundingClientRect();
      const newX = Math.max(0, Math.min(windowX + deltaX, bounds.width - windowData.state.width));
      const newY = Math.max(0, Math.min(windowY + deltaY, bounds.height - 50));

      windowData.state.x = newX;
      windowData.state.y = newY;
      windowData.element.style.left = `${newX}px`;
      windowData.element.style.top = `${newY}px`;
    }

    if (this.resizeState) {
      const { windowId, startX, startY, windowWidth, windowHeight } = this.resizeState;
      const windowData = this.windows.get(windowId);
      if (!windowData) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const minWidth = windowData.module.minSize?.width ?? (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--window-min-width')) || 200);
      const minHeight = windowData.module.minSize?.height ?? (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--window-min-height')) || 150);

      const newWidth = Math.max(minWidth, windowWidth + deltaX);
      const newHeight = Math.max(minHeight, windowHeight + deltaY);

      windowData.state.width = newWidth;
      windowData.state.height = newHeight;
      windowData.element.style.width = `${newWidth}px`;
      windowData.element.style.height = `${newHeight}px`;
    }
  }

  /**
   * Handle mouse up - end drag/resize
   */
  _onMouseUp() {
    if (this.dragState) {
      const windowData = this.windows.get(this.dragState.windowId);
      if (windowData) {
        windowData.element.classList.remove('dragging');
        this._saveState(this.dragState.windowId);
      }
      this.dragState = null;
    }

    if (this.resizeState) {
      const windowData = this.windows.get(this.resizeState.windowId);
      if (windowData) {
        windowData.element.classList.remove('resizing');
        this._saveState(this.resizeState.windowId);
      }
      this.resizeState = null;
    }
  }

  /**
   * Bring window to front
   */
  _bringToFront(windowId) {
    const windowData = this.windows.get(windowId);
    if (!windowData) return;

    // Remove active from previous
    if (this.activeWindow && this.activeWindow !== windowId) {
      const prevWindow = this.windows.get(this.activeWindow);
      if (prevWindow) {
        prevWindow.element.classList.remove('active');
      }
    }

    windowData.state.zIndex = this._getNextZIndex();
    windowData.element.style.zIndex = windowData.state.zIndex;
    windowData.element.classList.add('active');
    this.activeWindow = windowId;
  }

  /**
   * Get next z-index
   */
  _getNextZIndex() {
    return ++this.highestZIndex;
  }

  /**
   * Minimize window
   */
  minimize(windowId) {
    const windowData = this.windows.get(windowId);
    if (!windowData) return;

    windowData.state.minimized = true;
    windowData.element.classList.add('minimized');
    this._saveState(windowId);

    // Dispatch event for taskbar
    window.dispatchEvent(new CustomEvent('window-minimized', { detail: { windowId } }));
  }

  /**
   * Restore window from minimized state
   */
  restore(windowId) {
    const windowData = this.windows.get(windowId);
    if (!windowData) return;

    windowData.state.minimized = false;
    windowData.element.classList.remove('minimized');
    this._bringToFront(windowId);
    this._saveState(windowId);

    // Dispatch event for taskbar
    window.dispatchEvent(new CustomEvent('window-restored', { detail: { windowId } }));
  }

  /**
   * Toggle maximize state
   */
  toggleMaximize(windowId) {
    const windowData = this.windows.get(windowId);
    if (!windowData) return;

    if (windowData.state.maximized) {
      // Restore from maximized
      windowData.state.maximized = false;
      windowData.element.classList.remove('maximized');
      this._applyState(windowData);
    } else {
      // Store current position for restore
      windowData.state.restoreX = windowData.state.x;
      windowData.state.restoreY = windowData.state.y;
      windowData.state.restoreWidth = windowData.state.width;
      windowData.state.restoreHeight = windowData.state.height;

      windowData.state.maximized = true;
      windowData.element.classList.add('maximized');
    }

    this._saveState(windowId);
  }

  /**
   * Close window
   */
  close(windowId) {
    const windowData = this.windows.get(windowId);
    if (!windowData) return;

    // Call module destroy if exists
    if (windowData.module.destroy) {
      windowData.module.destroy();
    }

    windowData.element.remove();
    this.windows.delete(windowId);

    windowData.state.open = false;
    this._saveState(windowId, windowData.state);

    // Dispatch event for taskbar
    window.dispatchEvent(new CustomEvent('window-closed', { detail: { windowId } }));
  }

  /**
   * Check if window is open
   */
  isOpen(windowId) {
    return this.windows.has(windowId);
  }

  /**
   * Get window data
   */
  getWindow(windowId) {
    return this.windows.get(windowId);
  }

  /**
   * Save window state to storage
   */
  _saveState(windowId, state = null) {
    const windowData = this.windows.get(windowId);
    const stateToSave = state || windowData?.state;
    if (!stateToSave) return;

    Storage.set(STORAGE_NAMESPACE, windowId, {
      x: stateToSave.x,
      y: stateToSave.y,
      width: stateToSave.width,
      height: stateToSave.height,
      minimized: stateToSave.minimized,
      maximized: stateToSave.maximized,
      open: stateToSave.open
    });
  }

  /**
   * Load window state from storage
   */
  _loadState(windowId) {
    return Storage.get(STORAGE_NAMESPACE, windowId, null);
  }

  /**
   * Check if window was previously open
   */
  wasOpen(windowId) {
    const state = this._loadState(windowId);
    return state?.open ?? false;
  }
}

export default new WindowManager();
