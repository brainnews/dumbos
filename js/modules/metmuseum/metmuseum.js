/**
 * Art World Module - Explore art from museum collections worldwide
 */

const MET_API = 'https://collectionapi.metmuseum.org/public/collection/v1';

const MAX_COLLECTION = 10;

// --- Provider: The Metropolitan Museum of Art ---
const MetProvider = {
  id: 'met',
  name: 'The Met',

  async fetchCategories(storage) {
    const cached = storage.get('departments', null);
    if (cached) return cached.map(d => ({ id: d.departmentId, name: d.displayName }));

    const response = await fetch(`${MET_API}/departments`);
    if (!response.ok) throw new Error('Failed to fetch departments');
    const data = await response.json();
    const depts = data.departments || [];
    storage.set('departments', depts);
    return depts.map(d => ({ id: d.departmentId, name: d.displayName }));
  },

  _objectCache: {},

  async fetchObjectIds(categoryId) {
    const cacheKey = categoryId || 'all';
    if (this._objectCache[cacheKey]) return this._objectCache[cacheKey];

    let url = `${MET_API}/search?isHighlight=true&hasImages=true&q=*`;
    if (categoryId) url += `&departmentId=${categoryId}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to search objects');
    const data = await response.json();
    const ids = data.objectIDs || [];
    this._objectCache[cacheKey] = ids;
    return ids;
  },

  async fetchObject(objectId) {
    const response = await fetch(`${MET_API}/objects/${objectId}`);
    if (!response.ok) return null;
    const data = await response.json();

    const imageUrl = data.primaryImage || data.primaryImageSmall;
    if (!imageUrl) return null;

    return {
      id: `met-${data.objectID}`,
      source: 'met',
      title: data.title || 'Untitled',
      artist: this._formatArtist(data),
      date: data.objectDate || 'Date unknown',
      medium: data.medium || '',
      department: data.department || '',
      imageUrl,
      externalUrl: `https://www.metitate.art/object?id=${data.objectID}`,
      externalLabel: 'Open on metitate.art',
    };
  },

  _formatArtist(obj) {
    const parts = [];
    if (obj.artistDisplayName) parts.push(obj.artistDisplayName);
    if (obj.artistNationality && obj.artistDisplayBio) parts.push(obj.artistDisplayBio);
    else if (obj.artistNationality) parts.push(obj.artistNationality);
    return parts.join(', ');
  },

  destroy() {
    this._objectCache = {};
  }
};

// --- Provider: SMK (Statens Museum for Kunst, Denmark) ---
const SMK_API = 'https://api.smk.dk/api/v1';

const SMK_CATEGORIES = [
  { id: 'painting', name: 'Paintings' },
  { id: 'drawing', name: 'Drawings' },
  { id: 'print', name: 'Prints' },
  { id: 'sculpture', name: 'Sculpture' },
];

const SmkProvider = {
  id: 'smk',
  name: 'SMK Denmark',

  async fetchCategories() {
    return SMK_CATEGORIES;
  },

  _resultCache: {},

  async fetchObjectIds(categoryId) {
    const cacheKey = categoryId || 'all';
    if (this._resultCache[cacheKey]) return this._resultCache[cacheKey];

    let filters = '[has_image:true],[public_domain:true]';
    if (categoryId) filters += `,[object_names:${categoryId}]`;

    const url = `${SMK_API}/art/search/?keys=*&filters=${encodeURIComponent(filters)}&offset=0&rows=2000&lang=en`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to search SMK');
    const data = await response.json();
    const items = (data.items || []).filter(item => item.image_thumbnail);

    this._resultCache[cacheKey] = items;
    return items;
  },

  async fetchObject(item) {
    // SMK search already returns full objects, so item IS the object
    const title = (item.titles && item.titles[0] && item.titles[0].title) || 'Untitled';
    const prod = (item.production && item.production[0]) || {};
    const artist = prod.creator || '';
    const dateInfo = (item.production_date && item.production_date[0]) || {};
    const date = dateInfo.period || '';
    const techniques = (item.techniques || []).join(', ');
    const category = (item.object_names && item.object_names[0] && item.object_names[0].name) || '';

    return {
      id: `smk-${item.object_number}`,
      source: 'smk',
      title,
      artist,
      date,
      medium: techniques,
      department: category,
      imageUrl: item.image_thumbnail,
      externalUrl: null,
      externalLabel: null,
    };
  },

  destroy() {
    this._resultCache = {};
  }
};

// --- Module ---
const MetMuseumModule = {
  id: 'metmuseum',
  title: 'Art World',
  category: 'entertainment',
  description: 'Explore art from museum collections worldwide',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-8h6v8"/><path d="M10 9h4"/></svg>`,
  defaultSize: { width: 500, height: 550 },
  minSize: { width: 350, height: 400 },

  container: null,
  storage: null,
  providers: [MetProvider, SmkProvider],
  currentProvider: null,
  currentObject: null,
  isLoading: false,
  activeView: 'explore', // 'explore' | 'collection'

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    const savedProviderId = storage.get('provider', 'met');
    this.currentProvider = this.providers.find(p => p.id === savedProviderId) || this.providers[0];
    this._buildUI();
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="metmuseum-container">
        <div class="metmuseum-header">
          <div class="metmuseum-tabs">
            <button class="metmuseum-tab active" data-view="explore">Explore</button>
            <button class="metmuseum-tab" data-view="collection">Collection <span class="metmuseum-tab-count">${this._getCollection().length}</span></button>
          </div>
          <div class="metmuseum-controls">
            ${this.providers.length > 1 ? `
              <select class="metmuseum-provider-select">
                ${this.providers.map(p => `<option value="${p.id}">${this._escapeHtml(p.name)}</option>`).join('')}
              </select>
            ` : ''}
            <select class="metmuseum-select" disabled>
              <option value="">Loading categories...</option>
            </select>
            <button class="metmuseum-refresh-btn" title="Load another artwork" disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="metmuseum-content">
          <div class="metmuseum-loading">
            <div class="metmuseum-spinner"></div>
            <span>Loading...</span>
          </div>
        </div>
      </div>
    `;

    this.selectEl = this.container.querySelector('.metmuseum-select');
    this.refreshBtn = this.container.querySelector('.metmuseum-refresh-btn');
    this.contentEl = this.container.querySelector('.metmuseum-content');
    this.controlsEl = this.container.querySelector('.metmuseum-controls');
    this.tabCountEl = this.container.querySelector('.metmuseum-tab-count');

    // Tab listeners
    this.container.querySelectorAll('.metmuseum-tab').forEach(tab => {
      tab.addEventListener('click', () => this._switchView(tab.dataset.view));
    });

    this.selectEl.addEventListener('change', () => this._onCategoryChange());
    this.refreshBtn.addEventListener('click', () => this._loadRandomObject());

    if (this.providers.length > 1) {
      const providerSelect = this.container.querySelector('.metmuseum-provider-select');
      providerSelect.value = this.currentProvider.id;
      providerSelect.addEventListener('change', (e) => {
        this.currentProvider = this.providers.find(p => p.id === e.target.value);
        this.storage.set('provider', this.currentProvider.id);
        this.storage.remove('selectedDepartment');
        this.currentObject = null;
        this._fetchCategories();
      });
    }
  },

  async render() {
    await this._fetchCategories();
  },

  // --- View Switching ---

  _switchView(view) {
    this.activeView = view;
    this.container.querySelectorAll('.metmuseum-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.view === view);
    });
    this.controlsEl.style.display = view === 'explore' ? '' : 'none';

    if (view === 'collection') {
      this._renderCollectionView();
    } else {
      if (this.currentObject) {
        this._renderObject(this.currentObject);
      } else {
        this._loadRandomObject();
      }
    }
  },

  // --- Categories ---

  async _fetchCategories() {
    try {
      const categories = await this.currentProvider.fetchCategories(this.storage);
      this._populateCategories(categories);
    } catch (error) {
      this._showError(`Failed to load categories: ${error.message}`);
    }
  },

  _populateCategories(categories) {
    this.selectEl.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      this.selectEl.appendChild(option);
    });
    this.selectEl.disabled = false;

    const saved = this.storage.get('selectedDepartment', '');
    if (saved) this.selectEl.value = saved;

    this._loadRandomObject();
  },

  _onCategoryChange() {
    this.storage.set('selectedDepartment', this.selectEl.value);
    this._loadRandomObject();
  },

  // --- Load Random Object ---

  async _loadRandomObject() {
    if (this.isLoading) return;
    this.isLoading = true;
    this._showLoading();
    this.refreshBtn.disabled = true;
    this.refreshBtn.classList.add('spinning');

    const categoryId = this.selectEl.value;

    try {
      const objectIds = await this.currentProvider.fetchObjectIds(categoryId);
      if (objectIds.length === 0) {
        this._showEmpty('No highlighted artworks found for this category.');
        return;
      }

      let attempts = 0;
      let obj = null;
      while (attempts < 3 && !obj) {
        const randomIndex = Math.floor(Math.random() * objectIds.length);
        try {
          obj = await this.currentProvider.fetchObject(objectIds[randomIndex]);
        } catch { /* skip */ }
        attempts++;
      }

      if (!obj) {
        this._showError('Could not find artwork with image. Try again.');
        return;
      }

      this.currentObject = obj;
      this._renderObject(obj);
    } catch (error) {
      this._showError(`Failed to load artwork: ${error.message}`);
    } finally {
      this.isLoading = false;
      this.refreshBtn.disabled = false;
      this.refreshBtn.classList.remove('spinning');
    }
  },

  // --- Render Artwork ---

  _renderObject(obj) {
    const collected = this._isCollected(obj.id);

    this.contentEl.innerHTML = `
      <div class="metmuseum-image-container">
        ${obj.imageUrl
          ? `<img class="metmuseum-image" src="${this._escapeHtml(obj.imageUrl)}" alt="${this._escapeHtml(obj.title)}" loading="lazy">`
          : '<span class="metmuseum-image-placeholder">No image available</span>'
        }
      </div>
      <div class="metmuseum-metadata">
        <h3 class="metmuseum-title">${this._escapeHtml(obj.title)}</h3>
        ${obj.artist ? `<p class="metmuseum-artist">${this._escapeHtml(obj.artist)}</p>` : ''}
        ${obj.date ? `<p class="metmuseum-detail">${this._escapeHtml(obj.date)}</p>` : ''}
        ${obj.medium ? `<p class="metmuseum-detail"><span class="metmuseum-detail-label">Medium:</span> ${this._escapeHtml(obj.medium)}</p>` : ''}
        ${obj.department ? `<p class="metmuseum-detail"><span class="metmuseum-detail-label">Department:</span> ${this._escapeHtml(obj.department)}</p>` : ''}
        <div class="metmuseum-actions">
          ${obj.externalUrl ? `
          <a href="${this._escapeHtml(obj.externalUrl)}" target="_blank" rel="noopener noreferrer" class="metmuseum-link">
            ${this._escapeHtml(obj.externalLabel)}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>` : ''}
          <button class="metmuseum-collect-btn ${collected ? 'collected' : ''}" title="${collected ? 'Remove from collection' : 'Add to collection'}">
            <svg viewBox="0 0 24 24" fill="${collected ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>${collected ? 'Collected' : 'Collect'}</span>
          </button>
        </div>
      </div>
    `;

    // Image error handler
    const img = this.contentEl.querySelector('.metmuseum-image');
    if (img) {
      img.onerror = () => {
        img.parentElement.innerHTML = '<span class="metmuseum-image-placeholder">Image failed to load</span>';
      };
    }

    // Collect button handler
    this.contentEl.querySelector('.metmuseum-collect-btn').addEventListener('click', () => {
      this._onCollectClick(obj);
    });
  },

  // --- Collection Storage ---

  _getCollection() {
    return this.storage.get('collection', []);
  },

  _saveCollection(collection) {
    this.storage.set('collection', collection);
    this._updateCollectionCount();
  },

  _updateCollectionCount() {
    if (this.tabCountEl) {
      this.tabCountEl.textContent = this._getCollection().length;
    }
  },

  _isCollected(id) {
    return this._getCollection().some(item => item.id === id);
  },

  _addToCollection(obj) {
    const collection = this._getCollection();
    if (collection.length >= MAX_COLLECTION) return false;
    if (collection.some(item => item.id === obj.id)) return false;
    collection.push(obj);
    this._saveCollection(collection);
    return true;
  },

  _removeFromCollection(id) {
    const collection = this._getCollection().filter(item => item.id !== id);
    this._saveCollection(collection);
  },

  _swapInCollection(oldId, newObj) {
    const collection = this._getCollection();
    const idx = collection.findIndex(item => item.id === oldId);
    if (idx === -1) return;
    collection[idx] = newObj;
    this._saveCollection(collection);
  },

  // --- Collect Action ---

  _onCollectClick(obj) {
    if (this._isCollected(obj.id)) {
      this._removeFromCollection(obj.id);
      this._renderObject(obj);
      return;
    }

    const collection = this._getCollection();
    if (collection.length < MAX_COLLECTION) {
      this._addToCollection(obj);
      this._renderObject(obj);
      this._showToast('Added to collection');
    } else {
      this._showSwapModal(obj);
    }
  },

  // --- Toast ---

  _showToast(message) {
    const existing = this.container.querySelector('.metmuseum-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'metmuseum-toast';
    toast.textContent = message;
    this.container.querySelector('.metmuseum-container').appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 1500);
  },

  // --- Collection View ---

  _renderCollectionView() {
    const collection = this._getCollection();

    if (collection.length === 0) {
      this.contentEl.innerHTML = `
        <div class="metmuseum-empty">
          <p>Your collection is empty. Explore art and collect up to ${MAX_COLLECTION} pieces.</p>
        </div>
      `;
      return;
    }

    this.contentEl.innerHTML = `
      <div class="metmuseum-collection-grid">
        ${collection.map(item => `
          <div class="metmuseum-collection-item" data-id="${this._escapeHtml(item.id)}">
            <div class="metmuseum-collection-thumb">
              <img src="${this._escapeHtml(item.imageUrl)}" alt="${this._escapeHtml(item.title)}" loading="lazy">
              <button class="metmuseum-collection-remove" title="Remove from collection">&times;</button>
            </div>
            <div class="metmuseum-collection-info">
              <span class="metmuseum-collection-title">${this._escapeHtml(item.title)}</span>
              ${item.artist ? `<span class="metmuseum-collection-artist">${this._escapeHtml(item.artist)}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Click handlers
    this.contentEl.querySelectorAll('.metmuseum-collection-item').forEach(el => {
      const id = el.dataset.id;

      el.querySelector('.metmuseum-collection-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this._removeFromCollection(id);
        this._renderCollectionView();
      });

      el.addEventListener('click', () => {
        const item = this._getCollection().find(i => i.id === id);
        if (item) {
          this.currentObject = item;
          this._switchView('explore');
        }
      });
    });
  },

  // --- Swap Modal ---

  _showSwapModal(newObj) {
    const collection = this._getCollection();
    const overlay = document.createElement('div');
    overlay.className = 'metmuseum-swap-overlay';
    overlay.innerHTML = `
      <div class="metmuseum-swap-modal">
        <div class="metmuseum-swap-header">
          <h3>Collection Full</h3>
          <p>Choose a piece to swap out for the new artwork.</p>
        </div>
        <div class="metmuseum-swap-new">
          <img src="${this._escapeHtml(newObj.imageUrl)}" alt="${this._escapeHtml(newObj.title)}">
          <div>
            <strong>${this._escapeHtml(newObj.title)}</strong>
            ${newObj.artist ? `<span>${this._escapeHtml(newObj.artist)}</span>` : ''}
          </div>
        </div>
        <div class="metmuseum-swap-divider">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/>
          </svg>
          swap for
        </div>
        <div class="metmuseum-swap-grid">
          ${collection.map(item => `
            <div class="metmuseum-swap-item" data-id="${this._escapeHtml(item.id)}" title="${this._escapeHtml(item.title)}">
              <img src="${this._escapeHtml(item.imageUrl)}" alt="${this._escapeHtml(item.title)}">
            </div>
          `).join('')}
        </div>
        <button class="metmuseum-swap-cancel">Cancel</button>
      </div>
    `;

    this.container.querySelector('.metmuseum-container').appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    overlay.querySelector('.metmuseum-swap-cancel').addEventListener('click', () => {
      this._dismissSwapModal(overlay);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._dismissSwapModal(overlay);
    });

    overlay.querySelectorAll('.metmuseum-swap-item').forEach(el => {
      el.addEventListener('click', () => {
        this._swapInCollection(el.dataset.id, newObj);
        this._dismissSwapModal(overlay);
        this._renderObject(newObj);
        this._showToast('Swapped into collection');
      });
    });
  },

  _dismissSwapModal(overlay) {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 200);
  },

  // --- UI States ---

  _showLoading() {
    this.contentEl.innerHTML = `
      <div class="metmuseum-loading">
        <div class="metmuseum-spinner"></div>
        <span>Loading artwork...</span>
      </div>
    `;
  },

  _showEmpty(message) {
    this.contentEl.innerHTML = `
      <div class="metmuseum-empty">
        <p>${this._escapeHtml(message)}</p>
        <button class="metmuseum-retry-btn">Try Again</button>
      </div>
    `;
    this.contentEl.querySelector('.metmuseum-retry-btn').addEventListener('click', () => this._loadRandomObject());
  },

  _showError(message) {
    this.contentEl.innerHTML = `
      <div class="metmuseum-empty error">
        <p>${this._escapeHtml(message)}</p>
        <button class="metmuseum-retry-btn">Retry</button>
      </div>
    `;
    this.contentEl.querySelector('.metmuseum-retry-btn').addEventListener('click', () => this._loadRandomObject());
  },

  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  destroy() {
    this.providers.forEach(p => p.destroy && p.destroy());
    this.currentObject = null;
  }
};

export default MetMuseumModule;
