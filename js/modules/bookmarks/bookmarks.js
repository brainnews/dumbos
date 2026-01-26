/**
 * Bookmarks Module - Quick links manager
 */
import ContextMenu from '../../core/context-menu.js';

const BookmarksModule = {
  id: 'bookmarks',
  title: 'Bookmarks',
  category: 'productivity',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  defaultSize: { width: 350, height: 400 },
  minSize: { width: 280, height: 300 },

  container: null,
  storage: null,
  bookmarks: [],
  showOnDesktop: false,
  dragging: null,
  dragOffset: { x: 0, y: 0 },

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this.bookmarks = storage.get('list', []);
    this.showOnDesktop = storage.get('showOnDesktop', false);
    this._migrateBookmarkPositions();
    this._buildUI();
    this._renderDesktopIcons();
  },

  _migrateBookmarkPositions() {
    // Add default positions to bookmarks that don't have them
    let needsSave = false;
    this.bookmarks.forEach((bookmark, index) => {
      if (bookmark.x === undefined || bookmark.y === undefined) {
        bookmark.x = 20 + (index % 1) * 100;
        bookmark.y = 20 + index * 90;
        needsSave = true;
      }
    });
    if (needsSave) {
      this._save();
    }
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="bookmarks-container">
        <div class="bookmarks-header">
          <button class="bookmarks-add-btn">+ Add Bookmark</button>
        </div>
        <div class="bookmarks-option">
          <label class="bookmarks-option-label">
            <input type="checkbox" class="bookmarks-option-checkbox" ${this.showOnDesktop ? 'checked' : ''}>
            <span>Show as desktop icons</span>
          </label>
        </div>
        <ul class="bookmarks-list"></ul>
        <div class="bookmarks-empty" style="display: none;">
          <p>No bookmarks yet</p>
          <p class="bookmarks-empty-hint">Click "Add Bookmark" to get started</p>
        </div>
      </div>

      <div class="bookmarks-dialog" style="display: none;">
        <div class="bookmarks-dialog-content">
          <h3 class="bookmarks-dialog-title">Add Bookmark</h3>
          <input type="text" class="bookmarks-input" data-field="name" placeholder="Name">
          <input type="url" class="bookmarks-input" data-field="url" placeholder="https://example.com">
          <div class="bookmarks-dialog-actions">
            <button class="bookmarks-dialog-btn bookmarks-dialog-cancel">Cancel</button>
            <button class="bookmarks-dialog-btn bookmarks-dialog-save">Save</button>
          </div>
        </div>
      </div>
    `;

    this.listEl = this.container.querySelector('.bookmarks-list');
    this.emptyEl = this.container.querySelector('.bookmarks-empty');
    this.dialogEl = this.container.querySelector('.bookmarks-dialog');
    this.dialogTitle = this.container.querySelector('.bookmarks-dialog-title');
    this.nameInput = this.container.querySelector('[data-field="name"]');
    this.urlInput = this.container.querySelector('[data-field="url"]');

    this.editingIndex = null;

    // Event listeners
    this.container.querySelector('.bookmarks-add-btn').addEventListener('click', () => this._showDialog());
    this.container.querySelector('.bookmarks-dialog-cancel').addEventListener('click', () => this._hideDialog());
    this.container.querySelector('.bookmarks-dialog-save').addEventListener('click', () => this._saveBookmark());
    this.dialogEl.addEventListener('click', (e) => {
      if (e.target === this.dialogEl) this._hideDialog();
    });
    this.urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this._saveBookmark();
    });

    // Desktop icons toggle
    this.container.querySelector('.bookmarks-option-checkbox').addEventListener('change', (e) => {
      this.showOnDesktop = e.target.checked;
      this.storage.set('showOnDesktop', this.showOnDesktop);
      this._renderDesktopIcons();
    });
  },

  render() {
    this._renderList();
  },

  _renderList() {
    if (this.bookmarks.length === 0) {
      this.listEl.style.display = 'none';
      this.emptyEl.style.display = 'flex';
      return;
    }

    this.listEl.style.display = 'block';
    this.emptyEl.style.display = 'none';
    this.listEl.innerHTML = '';

    this.bookmarks.forEach((bookmark, index) => {
      const li = document.createElement('li');
      li.className = 'bookmarks-item';

      const favicon = this._getFaviconUrl(bookmark.url);

      li.innerHTML = `
        <a href="${this._escapeHtml(bookmark.url)}" target="_blank" rel="noopener noreferrer" class="bookmarks-link">
          <img src="${favicon}" class="bookmarks-favicon" alt="" onerror="this.style.display='none'">
          <span class="bookmarks-name">${this._escapeHtml(bookmark.name)}</span>
        </a>
        <div class="bookmarks-actions">
          <button class="bookmarks-action-btn" data-action="edit" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="bookmarks-action-btn" data-action="delete" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;

      li.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
        e.preventDefault();
        this._editBookmark(index);
      });

      li.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.preventDefault();
        this._deleteBookmark(index);
      });

      this.listEl.appendChild(li);
    });
  },

  _renderDesktopIcons() {
    // Remove existing desktop bookmark icons
    const desktop = document.getElementById('desktop');
    desktop.querySelectorAll('.desktop-bookmark').forEach(el => el.remove());

    if (!this.showOnDesktop || this.bookmarks.length === 0) return;

    this.bookmarks.forEach((bookmark, index) => {
      const el = this._createDesktopBookmark(bookmark, index);
      desktop.appendChild(el);
    });
  },

  _createDesktopBookmark(bookmark, index) {
    const el = document.createElement('div');
    el.className = 'desktop-bookmark';
    el.dataset.bookmarkIndex = index;
    el.style.left = `${bookmark.x || 20}px`;
    el.style.top = `${bookmark.y || 20 + index * 90}px`;

    const favicon = this._getFaviconUrl(bookmark.url);

    el.innerHTML = `
      <div class="desktop-bookmark-icon">
        <img src="${favicon}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <svg style="display:none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      </div>
      <div class="desktop-bookmark-label">${this._escapeHtml(bookmark.name)}</div>
    `;

    // Double-click to open
    el.addEventListener('dblclick', (e) => {
      e.preventDefault();
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
    });

    // Right-click context menu
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._showBookmarkContextMenu(e, bookmark, index);
    });

    // Drag functionality
    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this._startDrag(e, el, bookmark, index);
    });

    return el;
  },

  _startDrag(e, el, bookmark, index) {
    e.preventDefault();
    this.dragging = { el, bookmark, index };

    const rect = el.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    el.classList.add('dragging');

    const desktop = document.getElementById('desktop');

    const onMouseMove = (e) => {
      if (!this.dragging) return;

      const containerRect = desktop.getBoundingClientRect();
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

      const containerRect = desktop.getBoundingClientRect();
      let newX = e.clientX - containerRect.left - this.dragOffset.x;
      let newY = e.clientY - containerRect.top - this.dragOffset.y;

      // Constrain to desktop bounds
      newX = Math.max(0, Math.min(newX, containerRect.width - 80));
      newY = Math.max(0, Math.min(newY, containerRect.height - 80));

      // Update bookmark position
      this.bookmarks[index].x = newX;
      this.bookmarks[index].y = newY;
      this._save();

      el.classList.remove('dragging');
      this.dragging = null;

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  },

  _showBookmarkContextMenu(e, bookmark, index) {
    const items = [
      {
        label: 'Open',
        action: () => {
          window.open(bookmark.url, '_blank', 'noopener,noreferrer');
        }
      },
      { separator: true },
      {
        label: 'Edit',
        action: () => {
          this._editBookmark(index);
          // Bring bookmarks window to front or open it
          window.DumbOS.openModule('bookmarks');
        }
      },
      {
        label: 'Remove from Desktop',
        action: () => {
          this.bookmarks[index].x = undefined;
          this.bookmarks[index].y = undefined;
          this._save();
          this._renderDesktopIcons();
        }
      },
      { separator: true },
      {
        label: 'Delete Bookmark',
        action: () => {
          this._deleteBookmark(index);
        }
      }
    ];

    ContextMenu.show(e.clientX, e.clientY, items);
  },

  _getFaviconUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return '';
    }
  },

  _showDialog(bookmark = null, index = null) {
    this.editingIndex = index;
    this.dialogTitle.textContent = index !== null ? 'Edit Bookmark' : 'Add Bookmark';
    this.nameInput.value = bookmark?.name || '';
    this.urlInput.value = bookmark?.url || '';
    this.dialogEl.style.display = 'flex';
    this.nameInput.focus();
  },

  _hideDialog() {
    this.dialogEl.style.display = 'none';
    this.editingIndex = null;
  },

  _saveBookmark() {
    const name = this.nameInput.value.trim();
    let url = this.urlInput.value.trim();

    if (!name || !url) return;

    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    if (this.editingIndex !== null) {
      // Preserve position when editing
      const existing = this.bookmarks[this.editingIndex];
      this.bookmarks[this.editingIndex] = { name, url, x: existing.x, y: existing.y };
    } else {
      // Calculate position for new bookmark
      const index = this.bookmarks.length;
      const x = 20;
      const y = 20 + index * 90;
      this.bookmarks.push({ name, url, x, y });
    }

    this._save();
    this._hideDialog();
    this._renderList();
    this._renderDesktopIcons();
  },

  _editBookmark(index) {
    this._showDialog(this.bookmarks[index], index);
  },

  _deleteBookmark(index) {
    this.bookmarks.splice(index, 1);
    this._save();
    this._renderList();
    this._renderDesktopIcons();
  },

  _save() {
    this.storage.set('list', this.bookmarks);
  },

  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  destroy() {
    // Keep desktop icons visible even when window closes
    // They will be re-rendered on next init if setting is enabled
  }
};

// Render desktop bookmark icons on page load if enabled
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const storage = {
      get: (key, def) => {
        try {
          const val = localStorage.getItem(`dumbos:bookmarks:${key}`);
          return val !== null ? JSON.parse(val) : def;
        } catch { return def; }
      }
    };
    const showOnDesktop = storage.get('showOnDesktop', false);
    const bookmarks = storage.get('list', []);

    if (showOnDesktop && bookmarks.length > 0) {
      const desktop = document.getElementById('desktop');
      const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

      bookmarks.forEach((bookmark, index) => {
        const el = document.createElement('div');
        el.className = 'desktop-bookmark';
        el.dataset.bookmarkIndex = index;
        el.style.left = `${bookmark.x || 20}px`;
        el.style.top = `${bookmark.y || 20 + index * 90}px`;

        let domain = '';
        try { domain = new URL(bookmark.url).hostname; } catch {}
        const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';

        el.innerHTML = `
          <div class="desktop-bookmark-icon">
            <img src="${favicon}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <svg style="display:none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <div class="desktop-bookmark-label">${escapeHtml(bookmark.name)}</div>
        `;

        // Double-click to open (basic, no drag on initial load)
        el.addEventListener('dblclick', () => {
          window.open(bookmark.url, '_blank', 'noopener,noreferrer');
        });

        desktop.appendChild(el);
      });
    }
  }, 0);
});

export default BookmarksModule;
