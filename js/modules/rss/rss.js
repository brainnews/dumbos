/**
 * RSS Module - RSS feed reader
 */

// Configure this to your deployed worker URL
const RSS_PROXY_URL = 'https://rss-proxy.miles-gilbert.workers.dev';

const RSSModule = {
  id: 'rss',
  title: 'RSS Reader',
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="18" r="3" fill="currentColor"/><path d="M4 4a16 16 0 0 1 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 10a10 10 0 0 1 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  defaultSize: { width: 600, height: 450 },
  minSize: { width: 400, height: 300 },

  container: null,
  storage: null,
  feeds: [],
  selectedFeed: null,
  articles: [],

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
          <div class="rss-empty">
            <p>Select a feed or add one to get started</p>
          </div>
          <ul class="rss-article-list" style="display: none;"></ul>
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

    // Event listeners
    this.container.querySelector('.rss-add-btn').addEventListener('click', () => this._showAddDialog());
    this.container.querySelector('.rss-dialog-cancel').addEventListener('click', () => this._hideAddDialog());
    this.container.querySelector('.rss-dialog-add').addEventListener('click', () => this._addFeed());
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
    this.storage.set('selectedFeed', index);
    this._renderFeeds();
    this._showLoading();

    const feed = this.feeds[index];

    try {
      const data = await this._fetchFeed(feed.url);
      this.articles = data.items || [];

      // Update feed title if we got a better one
      if (data.title && data.title !== feed.url) {
        this.feeds[index].title = data.title;
        this._saveFeeds();
        this._renderFeeds();
      }

      this._renderArticles();
    } catch (error) {
      this._showError(`Failed to load feed: ${error.message}`);
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
    this.articleListEl.innerHTML = '';

    this.articles.forEach(article => {
      const li = document.createElement('li');
      li.className = 'rss-article-item';

      const date = article.pubDate ? new Date(article.pubDate).toLocaleDateString() : '';

      li.innerHTML = `
        <a href="${this._escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer" class="rss-article-link">
          <h4 class="rss-article-title">${this._escapeHtml(article.title)}</h4>
          ${date ? `<time class="rss-article-date">${date}</time>` : ''}
          ${article.description ? `<p class="rss-article-desc">${this._escapeHtml(article.description)}</p>` : ''}
        </a>
      `;

      this.articleListEl.appendChild(li);
    });
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
