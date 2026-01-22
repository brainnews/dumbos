/**
 * Met Museum Module - Display random artworks from the Metropolitan Museum of Art
 */

const API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';

const MetMuseumModule = {
  id: 'metmuseum',
  title: 'metitate.art portal',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-8h6v8"/><path d="M10 9h4"/></svg>`,
  defaultSize: { width: 500, height: 550 },
  minSize: { width: 350, height: 400 },

  container: null,
  storage: null,
  departments: [],
  objectCache: {},  // departmentId -> [objectIds]
  currentObject: null,
  isLoading: false,

  /**
   * Initialize the module
   */
  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this._buildUI();
  },

  /**
   * Build the UI structure
   */
  _buildUI() {
    this.container.innerHTML = `
      <div class="metmuseum-container">
        <div class="metmuseum-header">
          <select class="metmuseum-select" disabled>
            <option value="">Loading departments...</option>
          </select>
          <button class="metmuseum-refresh-btn" title="Load another artwork" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
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

    // Event listeners
    this.selectEl.addEventListener('change', () => this._onDepartmentChange());
    this.refreshBtn.addEventListener('click', () => this._loadRandomObject());
  },

  /**
   * Render - called after init
   */
  async render() {
    await this._fetchDepartments();
  },

  /**
   * Fetch departments list
   */
  async _fetchDepartments() {
    try {
      // Check cache first
      const cached = this.storage.get('departments', null);
      if (cached) {
        this.departments = cached;
        this._populateDepartments();
        return;
      }

      const response = await fetch(`${API_BASE}/departments`);
      if (!response.ok) throw new Error('Failed to fetch departments');

      const data = await response.json();
      this.departments = data.departments || [];

      // Cache departments
      this.storage.set('departments', this.departments);

      this._populateDepartments();
    } catch (error) {
      this._showError(`Failed to load departments: ${error.message}`);
    }
  },

  /**
   * Populate department dropdown
   */
  _populateDepartments() {
    this.selectEl.innerHTML = '<option value="">All Departments</option>';

    this.departments.forEach(dept => {
      const option = document.createElement('option');
      option.value = dept.departmentId;
      option.textContent = dept.displayName;
      this.selectEl.appendChild(option);
    });

    this.selectEl.disabled = false;

    // Restore saved department
    const savedDept = this.storage.get('selectedDepartment', '');
    if (savedDept) {
      this.selectEl.value = savedDept;
    }

    // Load initial object
    this._loadRandomObject();
  },

  /**
   * Handle department change
   */
  _onDepartmentChange() {
    const deptId = this.selectEl.value;
    this.storage.set('selectedDepartment', deptId);
    this._loadRandomObject();
  },

  /**
   * Fetch object IDs for a department
   */
  async _fetchObjectIds(departmentId) {
    const cacheKey = departmentId || 'all';

    // Check cache
    if (this.objectCache[cacheKey]) {
      return this.objectCache[cacheKey];
    }

    let url = `${API_BASE}/search?isHighlight=true&hasImages=true&q=*`;
    if (departmentId) {
      url += `&departmentId=${departmentId}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to search objects');

    const data = await response.json();
    const objectIds = data.objectIDs || [];

    // Cache the results
    this.objectCache[cacheKey] = objectIds;

    return objectIds;
  },

  /**
   * Load a random object
   */
  async _loadRandomObject() {
    if (this.isLoading) return;

    this.isLoading = true;
    this._showLoading();
    this.refreshBtn.disabled = true;
    this.refreshBtn.classList.add('spinning');

    const departmentId = this.selectEl.value;

    try {
      const objectIds = await this._fetchObjectIds(departmentId);

      if (objectIds.length === 0) {
        this._showEmpty('No highlighted artworks found for this department.');
        return;
      }

      // Try up to 3 times to find a valid object with an image
      let attempts = 0;
      let obj = null;

      while (attempts < 3 && !obj) {
        const randomIndex = Math.floor(Math.random() * objectIds.length);
        const objectId = objectIds[randomIndex];

        try {
          const response = await fetch(`${API_BASE}/objects/${objectId}`);
          if (!response.ok) {
            attempts++;
            continue;
          }

          const data = await response.json();

          // Verify it has an image
          if (data.primaryImage || data.primaryImageSmall) {
            obj = data;
          } else {
            attempts++;
          }
        } catch {
          attempts++;
        }
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

  /**
   * Render an object
   */
  _renderObject(obj) {
    const imageUrl = obj.primaryImage || obj.primaryImageSmall;
    const artist = this._formatArtist(obj);
    const date = obj.objectDate || 'Date unknown';
    const medium = obj.medium || '';
    const department = obj.department || '';
    const meditateUrl = `https://www.metitate.art/object?id=${obj.objectID}`;

    this.contentEl.innerHTML = `
      <div class="metmuseum-image-container">
        ${imageUrl
          ? `<img class="metmuseum-image" src="${this._escapeHtml(imageUrl)}" alt="${this._escapeHtml(obj.title)}" loading="lazy">`
          : '<span class="metmuseum-image-placeholder">No image available</span>'
        }
      </div>
      <div class="metmuseum-metadata">
        <h3 class="metmuseum-title">${this._escapeHtml(obj.title || 'Untitled')}</h3>
        ${artist ? `<p class="metmuseum-artist">${this._escapeHtml(artist)}</p>` : ''}
        ${date ? `<p class="metmuseum-detail">${this._escapeHtml(date)}</p>` : ''}
        ${medium ? `<p class="metmuseum-detail"><span class="metmuseum-detail-label">Medium:</span> ${this._escapeHtml(medium)}</p>` : ''}
        ${department ? `<p class="metmuseum-detail"><span class="metmuseum-detail-label">Department:</span> ${this._escapeHtml(department)}</p>` : ''}
        <a href="${this._escapeHtml(meditateUrl)}" target="_blank" rel="noopener noreferrer" class="metmuseum-link">
          Open on metitate.art
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>
    `;

    // Handle image load error
    const img = this.contentEl.querySelector('.metmuseum-image');
    if (img) {
      img.onerror = () => {
        img.parentElement.innerHTML = '<span class="metmuseum-image-placeholder">Image failed to load</span>';
      };
    }
  },

  /**
   * Format artist information
   */
  _formatArtist(obj) {
    const parts = [];

    if (obj.artistDisplayName) {
      parts.push(obj.artistDisplayName);
    }

    if (obj.artistNationality && obj.artistDisplayBio) {
      parts.push(obj.artistDisplayBio);
    } else if (obj.artistNationality) {
      parts.push(obj.artistNationality);
    }

    return parts.join(', ');
  },

  /**
   * Show loading state
   */
  _showLoading() {
    this.contentEl.innerHTML = `
      <div class="metmuseum-loading">
        <div class="metmuseum-spinner"></div>
        <span>Loading artwork...</span>
      </div>
    `;
  },

  /**
   * Show empty state
   */
  _showEmpty(message) {
    this.contentEl.innerHTML = `
      <div class="metmuseum-empty">
        <p>${this._escapeHtml(message)}</p>
        <button class="metmuseum-retry-btn">Try Again</button>
      </div>
    `;
    this.contentEl.querySelector('.metmuseum-retry-btn').addEventListener('click', () => this._loadRandomObject());
  },

  /**
   * Show error state
   */
  _showError(message) {
    this.contentEl.innerHTML = `
      <div class="metmuseum-empty error">
        <p>${this._escapeHtml(message)}</p>
        <button class="metmuseum-retry-btn">Retry</button>
      </div>
    `;
    this.contentEl.querySelector('.metmuseum-retry-btn').addEventListener('click', () => this._loadRandomObject());
  },

  /**
   * Escape HTML
   */
  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Cleanup
   */
  destroy() {
    this.objectCache = {};
    this.currentObject = null;
  }
};

export default MetMuseumModule;
