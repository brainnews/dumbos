/**
 * RSS Module - RSS feed reader
 */
import Storage from '../../core/storage.js';

// Configure this to your deployed worker URL
const RSS_PROXY_URL = 'https://rss-proxy.miles-gilbert.workers.dev';

const RSSModule = {
  id: 'rss',
  title: 'RSS Reader',
  category: 'productivity',
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="18" r="3" fill="currentColor"/><path d="M4 4a16 16 0 0 1 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 10a10 10 0 0 1 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  defaultSize: { width: 600, height: 450 },
  minSize: { width: 400, height: 300 },

  container: null,
  storage: null,
  feeds: [],
  selectedFeed: null,
  articles: [],
  selectedArticle: null,

  /**
   * Initialize the module
   */
  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this.feeds = this.storage.get('feeds', []);
    this._buildUI();
  },

  /**
   * Build the RSS UI
   */
  _buildUI() {
    this.container.innerHTML = `
      <div class="rss-layout">
        <aside class="rss-sidebar">
          <div class="rss-sidebar-header">
            <span>Feeds</span>
            <button class="rss-add-btn" title="Add Feed">+</button>
          </div>
          <ul class="rss-feed-list"></ul>
        </aside>
        <main class="rss-main">
          <div class="rss-main-header" style="display: none;">
            <span class="rss-main-title"></span>
            <button class="rss-refresh-btn" title="Refresh">↻</button>
          </div>
          <div class="rss-empty">
            <p>Select a feed or add one to get started</p>
          </div>
          <ul class="rss-article-list" style="display: none;"></ul>
          <div class="rss-reader" style="display: none;">
            <div class="rss-reader-header">
              <button class="rss-reader-back">← Back</button>
              <a class="rss-reader-link" href="#" target="_blank" rel="noopener noreferrer">Open in browser</a>
            </div>
            <article class="rss-reader-content"></article>
          </div>
        </main>
      </div>

      <!-- Add Feed Dialog -->
      <div class="rss-dialog" style="display: none;">
        <div class="rss-dialog-content">
          <h3>Add RSS Feed</h3>
          <input type="url" class="rss-url-input" placeholder="https://example.com/feed.xml">
          <div class="rss-dialog-actions">
            <button class="rss-dialog-cancel">Cancel</button>
            <button class="rss-dialog-add">Add</button>
          </div>
        </div>
      </div>
    `;

    this.feedListEl = this.container.querySelector('.rss-feed-list');
    this.articleListEl = this.container.querySelector('.rss-article-list');
    this.emptyEl = this.container.querySelector('.rss-empty');
    this.dialogEl = this.container.querySelector('.rss-dialog');
    this.urlInput = this.container.querySelector('.rss-url-input');
    this.mainHeaderEl = this.container.querySelector('.rss-main-header');
    this.mainTitleEl = this.container.querySelector('.rss-main-title');
    this.readerEl = this.container.querySelector('.rss-reader');
    this.readerContentEl = this.container.querySelector('.rss-reader-content');

    // Event listeners
    this.container.querySelector('.rss-add-btn').addEventListener('click', () => this._showAddDialog());
    this.container.querySelector('.rss-dialog-cancel').addEventListener('click', () => this._hideAddDialog());
    this.container.querySelector('.rss-dialog-add').addEventListener('click', () => this._addFeed());
    this.container.querySelector('.rss-refresh-btn').addEventListener('click', () => this._refreshFeed());
    this.container.querySelector('.rss-reader-back').addEventListener('click', () => this._closeReader());
    this.urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this._addFeed();
    });
    this.dialogEl.addEventListener('click', (e) => {
      if (e.target === this.dialogEl) this._hideAddDialog();
    });
  },

  /**
   * Render the feeds list
   */
  render() {
    this._renderFeeds();

    // Restore previously selected feed
    const savedIndex = this.storage.get('selectedFeed', null);
    if (savedIndex !== null && savedIndex < this.feeds.length) {
      this._selectFeed(savedIndex);
    }
  },

  /**
   * Render feeds list
   */
  _renderFeeds() {
    this.feedListEl.innerHTML = '';

    this.feeds.forEach((feed, index) => {
      const li = document.createElement('li');
      li.className = 'rss-feed-item';
      if (this.selectedFeed === index) {
        li.classList.add('active');
      }

      li.innerHTML = `
        <span class="rss-feed-title">${this._escapeHtml(feed.title || feed.url)}</span>
        <button class="rss-remove-btn" title="Remove">&times;</button>
      `;

      li.querySelector('.rss-feed-title').addEventListener('click', () => this._selectFeed(index));
      li.querySelector('.rss-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this._removeFeed(index);
      });

      this.feedListEl.appendChild(li);
    });
  },

  /**
   * Show add feed dialog
   */
  _showAddDialog() {
    this.urlInput.value = '';
    this.dialogEl.style.display = 'flex';
    this.urlInput.focus();
  },

  /**
   * Hide add feed dialog
   */
  _hideAddDialog() {
    this.dialogEl.style.display = 'none';
  },

  /**
   * Add a new feed
   */
  async _addFeed() {
    const url = this.urlInput.value.trim();
    if (!url) return;

    // Check if already exists
    if (this.feeds.some(f => f.url === url)) {
      alert('Feed already added');
      return;
    }

    this._hideAddDialog();
    this._showLoading();

    try {
      const data = await this._fetchFeed(url);

      this.feeds.push({
        url,
        title: data.title || url
      });

      this._saveFeeds();
      this._renderFeeds();

      // Select the new feed
      this._selectFeed(this.feeds.length - 1);
    } catch (error) {
      alert(`Failed to add feed: ${error.message}`);
      this._showEmpty();
    }
  },

  /**
   * Remove a feed
   */
  _removeFeed(index) {
    this.feeds.splice(index, 1);
    this._saveFeeds();

    if (this.selectedFeed === index) {
      this.selectedFeed = null;
      this.storage.remove('selectedFeed');
      this.articles = [];
      this._showEmpty();
    } else if (this.selectedFeed > index) {
      this.selectedFeed--;
      this.storage.set('selectedFeed', this.selectedFeed);
    }

    this._renderFeeds();
  },

  /**
   * Select a feed and load its articles
   */
  async _selectFeed(index) {
    this.selectedFeed = index;
    this.selectedArticle = null;
    this.storage.set('selectedFeed', index);
    this._renderFeeds();
    this._showLoading();

    const feed = this.feeds[index];
    this.mainTitleEl.textContent = feed.title || feed.url;
    this.mainHeaderEl.style.display = 'flex';
    this.readerEl.style.display = 'none';

    try {
      const data = await this._fetchFeed(feed.url);
      this.articles = data.items || [];

      // Update feed title if we got a better one
      if (data.title && data.title !== feed.url) {
        this.feeds[index].title = data.title;
        this.mainTitleEl.textContent = data.title;
        this._saveFeeds();
        this._renderFeeds();
      }

      this._renderArticles();
    } catch (error) {
      this._showError(`Failed to load feed: ${error.message}`);
    }
  },

  /**
   * Refresh the current feed
   */
  _refreshFeed() {
    if (this.selectedFeed !== null) {
      this._selectFeed(this.selectedFeed);
    }
  },

  /**
   * Fetch feed via proxy
   */
  async _fetchFeed(url) {
    const proxyUrl = `${RSS_PROXY_URL}?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  },

  /**
   * Render articles list
   */
  _renderArticles() {
    if (this.articles.length === 0) {
      this._showError('No articles found');
      return;
    }

    this.emptyEl.style.display = 'none';
    this.articleListEl.style.display = 'block';
    this.readerEl.style.display = 'none';
    this.articleListEl.innerHTML = '';

    this.articles.forEach((article, index) => {
      const li = document.createElement('li');
      li.className = 'rss-article-item';

      const date = article.pubDate ? new Date(article.pubDate).toLocaleDateString() : '';
      const hasContent = article.content || article.description;

      li.innerHTML = `
        <div class="rss-article-link">
          <h4 class="rss-article-title">${this._escapeHtml(article.title)}</h4>
          ${date ? `<time class="rss-article-date">${date}</time>` : ''}
          ${article.description ? `<p class="rss-article-desc">${this._escapeHtml(this._stripHtml(article.description))}</p>` : ''}
        </div>
      `;

      li.addEventListener('click', () => {
        if (hasContent) {
          this._openArticle(index);
        } else if (article.link) {
          window.open(this._transformLink(article.link), '_blank', 'noopener,noreferrer');
        }
      });

      this.articleListEl.appendChild(li);
    });
  },

  /**
   * Open article in reader
   */
  _openArticle(index) {
    const article = this.articles[index];
    this.selectedArticle = index;

    const link = this._transformLink(article.link);
    const date = article.pubDate ? new Date(article.pubDate).toLocaleDateString() : '';
    const content = article.content || article.description || '';

    this.container.querySelector('.rss-reader-link').href = link || '#';
    this.readerContentEl.innerHTML = `
      <h1 class="rss-reader-title">${this._escapeHtml(article.title)}</h1>
      ${date ? `<time class="rss-reader-date">${date}</time>` : ''}
      <div class="rss-reader-body">${this._sanitizeHtml(content)}</div>
    `;

    this.articleListEl.style.display = 'none';
    this.readerEl.style.display = 'flex';
  },

  /**
   * Close reader and return to article list
   */
  _closeReader() {
    this.selectedArticle = null;
    this.readerEl.style.display = 'none';
    this.articleListEl.style.display = 'block';
  },

  /**
   * Strip HTML tags for preview
   */
  _stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  },

  /**
   * Sanitize HTML for reader (allow basic formatting)
   */
  _sanitizeHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    // Remove script tags and event handlers
    tmp.querySelectorAll('script, style').forEach(el => el.remove());
    tmp.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(attr => {
        if (attr.name.startsWith('on') || attr.name === 'href' && attr.value.startsWith('javascript:')) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return tmp.innerHTML;
  },

  /**
   * Show loading state
   */
  _showLoading() {
    this.articleListEl.style.display = 'none';
    this.emptyEl.style.display = 'flex';
    this.emptyEl.innerHTML = '<p>Loading...</p>';
  },

  /**
   * Show empty state
   */
  _showEmpty() {
    this.articleListEl.style.display = 'none';
    this.readerEl.style.display = 'none';
    this.mainHeaderEl.style.display = 'none';
    this.emptyEl.style.display = 'flex';
    this.emptyEl.innerHTML = '<p>Select a feed or add one to get started</p>';
  },

  /**
   * Show error state
   */
  _showError(message) {
    this.articleListEl.style.display = 'none';
    this.emptyEl.style.display = 'flex';
    this.emptyEl.innerHTML = `<p class="error">${this._escapeHtml(message)}</p>`;
  },

  /**
   * Save feeds to storage
   */
  _saveFeeds() {
    this.storage.set('feeds', this.feeds);
  },

  /**
   * Transform article links (e.g., NPR text mode)
   */
  _transformLink(url) {
    if (!url) return url;
    const nprTextMode = Storage.get('rss', 'nprTextMode', true);
    if (nprTextMode && url.includes('www.npr.org')) {
      return url.replace('www.npr.org', 'text.npr.org');
    }
    return url;
  },

  /**
   * Escape HTML
   */
  _escapeHtml(str) {
    if (!str) return '';
    return str
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
    // Nothing to clean up
  }
};

export default RSSModule;
