/**
 * ContextMenu - Generic right-click menu system
 */
class ContextMenu {
  constructor() {
    this.menuEl = null;
    this._onClickOutside = this._onClickOutside.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  /**
   * Initialize the context menu system
   */
  init() {
    this.menuEl = document.createElement('div');
    this.menuEl.className = 'context-menu';
    this.menuEl.style.display = 'none';
    document.body.appendChild(this.menuEl);
  }

  /**
   * Show context menu at position with items
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Array} items - Menu items [{label, action, disabled, separator}]
   */
  show(x, y, items) {
    if (!this.menuEl) this.init();
    this.menuEl.innerHTML = '';

    items.forEach(item => {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        this.menuEl.appendChild(sep);
        return;
      }

      const menuItem = document.createElement('button');
      menuItem.className = 'context-menu-item';
      menuItem.textContent = item.label;

      if (item.disabled) {
        menuItem.disabled = true;
        menuItem.classList.add('disabled');
      } else {
        menuItem.addEventListener('click', () => {
          this.hide();
          if (item.action) item.action();
        });
      }

      this.menuEl.appendChild(menuItem);
    });

    // Position menu
    this.menuEl.style.display = 'block';

    // Adjust position to stay within viewport
    const menuRect = this.menuEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let posX = x;
    let posY = y;

    if (x + menuRect.width > viewportWidth) {
      posX = viewportWidth - menuRect.width - 8;
    }
    if (y + menuRect.height > viewportHeight) {
      posY = viewportHeight - menuRect.height - 8;
    }

    this.menuEl.style.left = `${posX}px`;
    this.menuEl.style.top = `${posY}px`;

    // Add event listeners
    document.addEventListener('click', this._onClickOutside, true);
    document.addEventListener('keydown', this._onKeyDown);
  }

  /**
   * Hide the context menu
   */
  hide() {
    this.menuEl.style.display = 'none';
    document.removeEventListener('click', this._onClickOutside, true);
    document.removeEventListener('keydown', this._onKeyDown);
  }

  /**
   * Handle click outside menu
   */
  _onClickOutside(e) {
    if (!this.menuEl.contains(e.target)) {
      this.hide();
    }
  }

  /**
   * Handle keyboard events
   */
  _onKeyDown(e) {
    if (e.key === 'Escape') {
      this.hide();
    }
  }

  /**
   * Check if menu is visible
   */
  isVisible() {
    return this.menuEl.style.display !== 'none';
  }
}

export default new ContextMenu();
