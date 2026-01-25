/**
 * Bookmarks Module - Quick links manager
 */
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
  desktopIconsContainer: null,

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this.bookmarks = storage.get('list', []);
    this.showOnDesktop = storage.get('showOnDesktop', false);
    this._buildUI();
    this._renderDesktopIcons();
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
    // Remove existing desktop icons
    if (this.desktopIconsContainer) {
      this.desktopIconsContainer.remove();
      this.desktopIconsContainer = null;
    }

    if (!this.showOnDesktop || this.bookmarks.length === 0) return;

    const desktop = document.getElementById('desktop');
    this.desktopIconsContainer = document.createElement('div');
    this.desktopIconsContainer.className = 'desktop-icons';

    this.bookmarks.forEach((bookmark) => {
      const icon = document.createElement('a');
      icon.className = 'desktop-icon';
      icon.href = bookmark.url;
      icon.target = '_blank';
      icon.rel = 'noopener noreferrer';

      const favicon = this._getFaviconUrl(bookmark.url);

      icon.innerHTML = `
        <div class="desktop-icon-img">
          <img src="${favicon}" alt="" onerror="this.parentElement.innerHTML='<svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'/><line x1=\\'2\\' y1=\\'12\\' x2=\\'22\\' y2=\\'12\\'/><path d=\\'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z\\'/></svg>'">
        </div>
        <span class="desktop-icon-label">${this._escapeHtml(bookmark.name)}</span>
      `;

      this.desktopIconsContainer.appendChild(icon);
    });

    desktop.appendChild(this.desktopIconsContainer);
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
      this.bookmarks[this.editingIndex] = { name, url };
    } else {
      this.bookmarks.push({ name, url });
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

// Render desktop icons on page load if enabled
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
      const container = document.createElement('div');
      container.className = 'desktop-icons';

      bookmarks.forEach((bookmark) => {
        const icon = document.createElement('a');
        icon.className = 'desktop-icon';
        icon.href = bookmark.url;
        icon.target = '_blank';
        icon.rel = 'noopener noreferrer';

        let domain = '';
        try { domain = new URL(bookmark.url).hostname; } catch {}
        const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';

        const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        icon.innerHTML = `
          <div class="desktop-icon-img">
            <img src="${favicon}" alt="" onerror="this.parentElement.innerHTML='<svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'/><line x1=\\'2\\' y1=\\'12\\' x2=\\'22\\' y2=\\'12\\'/><path d=\\'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z\\'/></svg>'">
          </div>
          <span class="desktop-icon-label">${escapeHtml(bookmark.name)}</span>
        `;

        container.appendChild(icon);
      });

      desktop.appendChild(container);
    }
  }, 0);
});

export default BookmarksModule;
