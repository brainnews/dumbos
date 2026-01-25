/**
 * Browser Module - View saved pages from Code Editor
 */
import Storage from '../../core/storage.js';

const BrowserModule = {
  id: 'browser',
  title: 'Browser',
  category: 'tools',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  defaultSize: { width: 800, height: 600 },
  minSize: { width: 400, height: 300 },

  container: null,
  _history: [],
  _historyIndex: -1,
  _currentSlug: null,
  _onPagesChanged: null,

  init(container) {
    this.container = container;
    this._history = [null];
    this._historyIndex = 0;
    this._currentSlug = null;
    this._buildUI();
    this._showHomepage();

    this._onPagesChanged = () => {
      if (this._currentSlug === null) {
        this._showHomepage();
      } else {
        // Check if current page still exists
        const pages = this._getPages();
        const page = pages.find(p => p.slug === this._currentSlug);
        if (!page) {
          this._showNotFound(this._currentSlug);
        }
      }
    };
    window.addEventListener('pages-changed', this._onPagesChanged);
  },

  _getPages() {
    return Storage.get('pages', 'list', []);
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="browser-container">
        <div class="browser-navbar">
          <button class="browser-nav-btn" data-nav="back" title="Back" disabled>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="browser-nav-btn" data-nav="forward" title="Forward" disabled>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button class="browser-nav-btn" data-nav="home" title="Home">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </button>
          <div class="browser-address-bar">
            <input type="text" class="browser-address-input" placeholder="dumbos://page-slug" spellcheck="false" />
          </div>
        </div>
        <div class="browser-viewport"></div>
      </div>
    `;

    // Navigation buttons
    this.container.querySelector('[data-nav="back"]').addEventListener('click', () => this._goBack());
    this.container.querySelector('[data-nav="forward"]').addEventListener('click', () => this._goForward());
    this.container.querySelector('[data-nav="home"]').addEventListener('click', () => this._navigate(null));

    // Address bar
    const input = this.container.querySelector('.browser-address-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim().replace(/^dumbos:\/\//, '');
        if (val) {
          this._navigate(val);
        } else {
          this._navigate(null);
        }
      }
    });
  },

  _navigate(slug) {
    // Push to history
    if (this._historyIndex < this._history.length - 1) {
      this._history = this._history.slice(0, this._historyIndex + 1);
    }
    this._history.push(slug);
    this._historyIndex = this._history.length - 1;

    if (slug === null) {
      this._showHomepage();
    } else {
      this._showPage(slug);
    }

    this._updateNavButtons();
  },

  _goBack() {
    if (this._historyIndex > 0) {
      this._historyIndex--;
      const slug = this._history[this._historyIndex];
      if (slug === null) {
        this._showHomepage();
      } else {
        this._showPage(slug);
      }
      this._updateNavButtons();
    }
  },

  _goForward() {
    if (this._historyIndex < this._history.length - 1) {
      this._historyIndex++;
      const slug = this._history[this._historyIndex];
      if (slug === null) {
        this._showHomepage();
      } else {
        this._showPage(slug);
      }
      this._updateNavButtons();
    }
  },

  _updateNavButtons() {
    const back = this.container.querySelector('[data-nav="back"]');
    const forward = this.container.querySelector('[data-nav="forward"]');
    back.disabled = this._historyIndex <= 0;
    forward.disabled = this._historyIndex >= this._history.length - 1;
  },

  _updateAddressBar(slug) {
    const input = this.container.querySelector('.browser-address-input');
    input.value = slug ? `dumbos://${slug}` : '';
  },

  _showHomepage() {
    this._currentSlug = null;
    this._updateAddressBar(null);

    const viewport = this.container.querySelector('.browser-viewport');
    const pages = this._getPages();

    if (pages.length === 0) {
      viewport.innerHTML = `
        <div class="browser-empty">
          <div class="browser-empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <h2>No saved pages yet</h2>
          <p>Use the Code Editor to create and save pages.</p>
        </div>
      `;
      return;
    }

    viewport.innerHTML = `
      <div class="browser-homepage">
        <h2 class="browser-homepage-title">Your Pages</h2>
        <div class="browser-homepage-grid">
          ${pages.map(page => `
            <div class="browser-page-card" data-slug="${page.slug}">
              <div class="browser-page-card-name">${page.name}</div>
              <div class="browser-page-card-url">dumbos://${page.slug}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    viewport.querySelectorAll('.browser-page-card').forEach(card => {
      card.addEventListener('click', () => this._navigate(card.dataset.slug));
    });
  },

  _showPage(slug) {
    this._currentSlug = slug;
    this._updateAddressBar(slug);

    const pages = this._getPages();
    const page = pages.find(p => p.slug === slug);

    if (!page) {
      this._showNotFound(slug);
      return;
    }

    const viewport = this.container.querySelector('.browser-viewport');
    viewport.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.className = 'browser-page-frame';
    iframe.sandbox = 'allow-scripts';
    viewport.appendChild(iframe);

    // Compile the page the same way Code Editor does
    let finalHtml = page.html || '';

    if (page.css && page.css.trim()) {
      const styleTag = `<style>\n${page.css}\n</style>`;
      if (finalHtml.includes('</head>')) {
        finalHtml = finalHtml.replace('</head>', `${styleTag}\n</head>`);
      } else if (finalHtml.includes('<body')) {
        finalHtml = finalHtml.replace(/<body/i, `${styleTag}\n<body`);
      } else {
        finalHtml = styleTag + '\n' + finalHtml;
      }
    }

    if (page.js && page.js.trim()) {
      const scriptTag = `<script>\n${page.js}\n<\/script>`;
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        finalHtml = finalHtml + '\n' + scriptTag;
      }
    }

    iframe.srcdoc = finalHtml;
  },

  _showNotFound(slug) {
    this._currentSlug = slug;
    this._updateAddressBar(slug);

    const viewport = this.container.querySelector('.browser-viewport');
    viewport.innerHTML = `
      <div class="browser-empty">
        <h2>Page Not Found</h2>
        <p>The page <strong>dumbos://${slug}</strong> does not exist.</p>
      </div>
    `;
  },

  render() {},

  destroy() {
    if (this._onPagesChanged) {
      window.removeEventListener('pages-changed', this._onPagesChanged);
      this._onPagesChanged = null;
    }
  }
};

export default BrowserModule;
