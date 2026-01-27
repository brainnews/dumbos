/**
 * Stock Tracker Module - Track US and Japanese stocks
 */
const STOCK_PROXY_URL = 'https://rss-proxy.miles-gilbert.workers.dev';

const StockTrackerModule = {
  id: 'stocktracker',
  title: 'Stocks',
  category: 'productivity',
  description: 'Track stocks from US and Japanese markets',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  defaultSize: { width: 550, height: 400 },
  minSize: { width: 450, height: 300 },

  container: null,
  storage: null,
  watchlist: [],
  stockData: {},
  selectedStock: null,
  isLoading: false,

  /**
   * Initialize the module
   */
  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this._loadData();
    this._buildUI();
  },

  /**
   * Load data from storage
   */
  _loadData() {
    this.watchlist = this.storage.get('watchlist', []);
    this.stockData = this.storage.get('stockData', {});
    this.selectedStock = this.storage.get('selectedStock', null);
  },

  /**
   * Build the UI
   */
  _buildUI() {
    this.container.innerHTML = `
      <div class="stocktracker-layout">
        <aside class="stocktracker-sidebar">
          <div class="stocktracker-sidebar-header">
            <span>Watchlist</span>
            <button class="stocktracker-add-btn" title="Add Stock">+</button>
          </div>
          <ul class="stocktracker-list"></ul>
        </aside>
        <main class="stocktracker-main">
          <div class="stocktracker-empty">
            <p>Add a stock to your watchlist</p>
            <p class="stocktracker-hint">US: AAPL, GOOGL, MSFT</p>
            <p class="stocktracker-hint">Japan: 6098.T, 7203.T</p>
          </div>
          <div class="stocktracker-details" style="display: none;">
            <div class="stocktracker-details-header">
              <div class="stocktracker-symbol"></div>
              <div class="stocktracker-name"></div>
            </div>
            <div class="stocktracker-price-section">
              <span class="stocktracker-price"></span>
              <span class="stocktracker-change"></span>
            </div>
            <div class="stocktracker-stats"></div>
            <div class="stocktracker-footer">
              <span class="stocktracker-updated"></span>
              <button class="stocktracker-refresh-btn">Refresh</button>
            </div>
          </div>
        </main>
      </div>
    `;

    this.listEl = this.container.querySelector('.stocktracker-list');
    this.emptyEl = this.container.querySelector('.stocktracker-empty');
    this.detailsEl = this.container.querySelector('.stocktracker-details');

    // Event listeners
    this.container.querySelector('.stocktracker-add-btn').addEventListener('click', () => this._addStock());
    this.container.querySelector('.stocktracker-refresh-btn').addEventListener('click', () => this._fetchQuotes());
  },

  /**
   * Render the module
   */
  render() {
    this._renderWatchlist();

    if (this.watchlist.length > 0) {
      // Fetch fresh data on open
      this._fetchQuotes();

      // Restore selected stock
      if (this.selectedStock && this.watchlist.includes(this.selectedStock)) {
        this._selectStock(this.selectedStock);
      } else if (this.watchlist.length > 0) {
        this._selectStock(this.watchlist[0]);
      }
    }
  },

  /**
   * Fetch quotes from Yahoo Finance via proxy worker
   */
  async _fetchQuotes() {
    if (this.watchlist.length === 0 || this.isLoading) return;

    this.isLoading = true;
    this._updateRefreshButton(true);

    try {
      const symbols = this.watchlist.join(',');
      const url = `${STOCK_PROXY_URL}?stocks=${encodeURIComponent(symbols)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.quotes) {
        data.quotes.forEach(quote => {
          if (quote && !quote.error) {
            this.stockData[quote.symbol] = quote;
          }
        });

        this.storage.set('stockData', this.stockData);
        this.storage.set('lastUpdated', Date.now());
        this._renderWatchlist();
        this._renderDetails();
      }
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
    } finally {
      this.isLoading = false;
      this._updateRefreshButton(false);
    }
  },

  /**
   * Update refresh button state
   */
  _updateRefreshButton(loading) {
    const btn = this.container.querySelector('.stocktracker-refresh-btn');
    if (btn) {
      btn.textContent = loading ? 'Loading...' : 'Refresh';
      btn.disabled = loading;
    }
  },

  /**
   * Add a stock to the watchlist
   */
  _addStock() {
    let symbol = prompt('Enter stock symbol (e.g., AAPL or 6098.T):');
    if (!symbol) return;

    symbol = symbol.toUpperCase().trim();

    if (this.watchlist.includes(symbol)) {
      alert('Stock already in watchlist');
      return;
    }

    this.watchlist.push(symbol);
    this.storage.set('watchlist', this.watchlist);
    this._fetchQuotes().then(() => {
      this._selectStock(symbol);
    });
  },

  /**
   * Remove a stock from the watchlist
   */
  _removeStock(symbol) {
    const index = this.watchlist.indexOf(symbol);
    if (index === -1) return;

    this.watchlist.splice(index, 1);
    delete this.stockData[symbol];

    this.storage.set('watchlist', this.watchlist);
    this.storage.set('stockData', this.stockData);

    if (this.selectedStock === symbol) {
      this.selectedStock = this.watchlist.length > 0 ? this.watchlist[0] : null;
      this.storage.set('selectedStock', this.selectedStock);
    }

    this._renderWatchlist();
    this._renderDetails();
  },

  /**
   * Select a stock to show details
   */
  _selectStock(symbol) {
    this.selectedStock = symbol;
    this.storage.set('selectedStock', symbol);
    this._renderWatchlist();
    this._renderDetails();
  },

  /**
   * Render the watchlist
   */
  _renderWatchlist() {
    this.listEl.innerHTML = '';

    if (this.watchlist.length === 0) {
      this.emptyEl.style.display = 'flex';
      this.detailsEl.style.display = 'none';
      return;
    }

    this.emptyEl.style.display = 'none';

    this.watchlist.forEach(symbol => {
      const quote = this.stockData[symbol];
      const li = document.createElement('li');
      li.className = 'stocktracker-item';

      if (this.selectedStock === symbol) {
        li.classList.add('active');
      }

      const price = quote?.regularMarketPrice;
      const changePercent = quote?.regularMarketChangePercent;
      const isPositive = changePercent >= 0;

      li.innerHTML = `
        <div class="stocktracker-item-content">
          <div class="stocktracker-item-row">
            <span class="stocktracker-item-symbol">${this._escapeHtml(symbol)}</span>
            <span class="stocktracker-item-price">${price != null ? this._formatCurrency(price, quote?.currency) : '—'}</span>
          </div>
          <div class="stocktracker-item-row">
            <span class="stocktracker-item-change ${changePercent != null ? (isPositive ? 'positive' : 'negative') : ''}">
              ${changePercent != null ? (isPositive ? '+' : '') + changePercent.toFixed(2) + '%' : '—'}
            </span>
          </div>
        </div>
        <button class="stocktracker-remove-btn" title="Remove">&times;</button>
      `;

      li.querySelector('.stocktracker-item-content').addEventListener('click', () => this._selectStock(symbol));
      li.querySelector('.stocktracker-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this._removeStock(symbol);
      });

      this.listEl.appendChild(li);
    });
  },

  /**
   * Render stock details
   */
  _renderDetails() {
    if (!this.selectedStock || this.watchlist.length === 0) {
      this.emptyEl.style.display = 'flex';
      this.detailsEl.style.display = 'none';
      return;
    }

    this.emptyEl.style.display = 'none';
    this.detailsEl.style.display = 'flex';

    const quote = this.stockData[this.selectedStock];

    const symbolEl = this.container.querySelector('.stocktracker-symbol');
    const nameEl = this.container.querySelector('.stocktracker-name');
    const priceEl = this.container.querySelector('.stocktracker-price');
    const changeEl = this.container.querySelector('.stocktracker-change');
    const statsEl = this.container.querySelector('.stocktracker-stats');
    const updatedEl = this.container.querySelector('.stocktracker-updated');

    symbolEl.textContent = this.selectedStock;
    nameEl.textContent = quote?.shortName || quote?.longName || '—';

    if (quote) {
      const price = quote.regularMarketPrice;
      const change = quote.regularMarketChange;
      const changePercent = quote.regularMarketChangePercent;
      const isPositive = change >= 0;
      const currency = quote.currency || 'USD';

      priceEl.textContent = this._formatCurrency(price, currency);
      changeEl.textContent = `${isPositive ? '+' : ''}${this._formatCurrency(change, currency)} (${isPositive ? '+' : ''}${changePercent.toFixed(2)}%)`;
      changeEl.className = `stocktracker-change ${isPositive ? 'positive' : 'negative'}`;

      statsEl.innerHTML = `
        <div class="stocktracker-stat">
          <span class="stocktracker-stat-label">Open</span>
          <span class="stocktracker-stat-value">${this._formatCurrency(quote.regularMarketOpen, currency)}</span>
        </div>
        <div class="stocktracker-stat">
          <span class="stocktracker-stat-label">High</span>
          <span class="stocktracker-stat-value">${this._formatCurrency(quote.regularMarketDayHigh, currency)}</span>
        </div>
        <div class="stocktracker-stat">
          <span class="stocktracker-stat-label">Low</span>
          <span class="stocktracker-stat-value">${this._formatCurrency(quote.regularMarketDayLow, currency)}</span>
        </div>
        <div class="stocktracker-stat">
          <span class="stocktracker-stat-label">Prev Close</span>
          <span class="stocktracker-stat-value">${this._formatCurrency(quote.regularMarketPreviousClose, currency)}</span>
        </div>
        <div class="stocktracker-stat">
          <span class="stocktracker-stat-label">Volume</span>
          <span class="stocktracker-stat-value">${this._formatNumber(quote.regularMarketVolume)}</span>
        </div>
        <div class="stocktracker-stat">
          <span class="stocktracker-stat-label">Mkt Cap</span>
          <span class="stocktracker-stat-value">${this._formatMarketCap(quote.marketCap)}</span>
        </div>
      `;

      const lastUpdated = this.storage.get('lastUpdated', null);
      if (lastUpdated) {
        const date = new Date(lastUpdated);
        updatedEl.textContent = `Updated: ${date.toLocaleTimeString()}`;
      }
    } else {
      priceEl.textContent = '—';
      changeEl.textContent = '—';
      changeEl.className = 'stocktracker-change';
      statsEl.innerHTML = '<p class="stocktracker-loading">Loading data...</p>';
      updatedEl.textContent = '';
    }
  },

  /**
   * Format currency value
   */
  _formatCurrency(value, currency = 'USD') {
    if (value == null) return '—';

    const locale = currency === 'JPY' ? 'ja-JP' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2
    }).format(value);
  },

  /**
   * Format large numbers
   */
  _formatNumber(value) {
    if (value == null) return '—';
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(value);
  },

  /**
   * Format market cap
   */
  _formatMarketCap(value) {
    if (value == null) return '—';
    if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T';
    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
    return value.toLocaleString();
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

export default StockTrackerModule;
