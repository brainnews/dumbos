/**
 * Radio - Internet radio player with presets and station search
 */
import ContextMenu from '../../core/context-menu.js';
import WindowManager from '../../core/window-manager.js';

const VisualizerStyles = {
  wispy: {
    name: 'Wispy Waveform',
    draw(ctx, dataArray, width, height, time) {
      ctx.clearRect(0, 0, width, height);

      const hue = (time * 30) % 360;
      const color = `hsl(${hue}, 100%, 65%)`;

      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
      ctx.globalAlpha = 0.3;

      ctx.beginPath();
      const sliceWidth = width / (dataArray.length - 1);
      let prevX = 0;
      let prevY = height / 2;

      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        const x = i * sliceWidth;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
        prevX = x;
        prevY = y;
      }
      ctx.lineTo(width, prevY);
      ctx.stroke();

      // Second pass with offset hue for depth
      const hue2 = (hue + 60) % 360;
      const color2 = `hsl(${hue2}, 100%, 65%)`;
      ctx.strokeStyle = color2;
      ctx.shadowColor = color2;
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2 + 2;
        const x = i * sliceWidth;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
        prevX = x;
        prevY = y;
      }
      ctx.lineTo(width, prevY);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }
};

const RadioModule = {
  id: 'radio',
  title: 'Radio',
  category: 'entertainment',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
    <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"/>
    <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/>
    <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>`,
  defaultSize: { width: 380, height: 520 },
  minSize: { width: 320, height: 420 },

  // State
  container: null,
  storage: null,
  audio: null,
  stations: [],
  presets: [null, null, null, null, null, null],
  volume: 80,
  currentStation: null,
  playState: 'idle', // idle, loading, playing, error
  activeTab: 'stations',
  collapsed: false,
  searchTimeout: null,
  SEARCH_DELAY: 400,
  _keyHandler: null,

  // Visualizer state
  visualizerEnabled: true,
  visualizerStyle: 'wispy',
  _audioCtx: null,
  _analyser: null,
  _sourceNode: null,
  _vizCanvas: null,
  _vizCtx: null,
  _vizRaf: null,
  _vizDataArray: null,

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this._loadData();
    this._buildUI();
    this._bindEvents();
  },

  render() {
    if (this.collapsed) {
      requestAnimationFrame(() => this._resizeWindow());
    }
  },

  destroy() {
    this._stopVisualizer();
    if (this._audioCtx) {
      this._audioCtx.close().catch(() => {});
      this._audioCtx = null;
      this._analyser = null;
      this._sourceNode = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio.load();
      this.audio = null;
    }
    document.title = 'DumbOS';
    clearTimeout(this.searchTimeout);
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  },

  _loadData() {
    this.stations = this.storage.get('stations', []);
    this.presets = this.storage.get('presets', [null, null, null, null, null, null]);
    this.volume = this.storage.get('volume', 80);
    this.currentStation = this.storage.get('lastStation', null);
    this.collapsed = this.storage.get('collapsed', false);
    this.visualizerEnabled = this.storage.get('visualizerEnabled', true);
    this.visualizerStyle = this.storage.get('visualizerStyle', 'wispy');
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="radio-app">
        <div class="radio-player">
          <canvas class="radio-visualizer${this.visualizerEnabled ? '' : ' hidden'}"></canvas>
          <div class="radio-artwork" title="${this.currentStation ? this._escapeHtml(this.currentStation.name) : ''}">
            ${this._renderArtwork(this.currentStation)}
          </div>
          <div class="radio-player-right">
            <div class="radio-now-playing">
              <div class="radio-station-name">${this.currentStation ? this._escapeHtml(this.currentStation.name) : 'No station selected'}</div>
              <div class="radio-station-meta">${this.currentStation ? this._formatMeta(this.currentStation) : ''}</div>
            </div>
            <div class="radio-controls">
              <button class="radio-play-btn" title="Play/Pause">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <polygon points="5,3 19,12 5,21"/>
                </svg>
              </button>
              <button class="radio-mute-btn" title="Mute">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                </svg>
              </button>
              <button class="radio-viz-btn${this.visualizerEnabled ? ' active' : ''}" title="Toggle visualizer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <path d="M2 12h2l3-6 4 12 4-8 3 4h4"/>
                </svg>
              </button>
              <input type="range" class="radio-volume" min="0" max="100" value="${this.volume}">
            </div>
            <div class="radio-status"></div>
          </div>
        </div>

        <div class="radio-presets">
          ${this.presets.map((p, i) => `
            <button class="radio-preset-btn" data-index="${i}" title="${p ? this._escapeHtml(p.name) : `Preset ${i + 1} (empty)`}">
              <span class="radio-preset-num">${i + 1}</span>
              <span class="radio-preset-name">${p ? this._escapeHtml(p.name) : ''}</span>
            </button>
          `).join('')}
        </div>

        <div class="radio-browse${this.collapsed ? ' collapsed' : ''}">
          <button class="radio-collapse-toggle" title="Toggle station browser">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          <div class="radio-browse-content">
            <div class="radio-tabs">
              <button class="radio-tab ${this.activeTab === 'stations' ? 'active' : ''}" data-tab="stations">My Stations</button>
              <button class="radio-tab ${this.activeTab === 'search' ? 'active' : ''}" data-tab="search">Search</button>
            </div>

            <div class="radio-tab-content" data-tab="stations" style="${this.activeTab !== 'stations' ? 'display:none' : ''}">
              <div class="radio-station-list">
                ${this._renderStationList()}
              </div>
            </div>

            <div class="radio-tab-content" data-tab="search" style="${this.activeTab !== 'search' ? 'display:none' : ''}">
              <div class="radio-search-bar">
                <input type="text" class="radio-search-input" placeholder="Search stations by name or tag...">
              </div>
              <div class="radio-search-results"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Create audio element
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.volume = this.volume / 100;

    // Set up visualizer canvas
    this._vizCanvas = this.container.querySelector('.radio-visualizer');
    this._vizCtx = this._vizCanvas.getContext('2d');

    this._updatePlayButton();
  },

  _bindEvents() {
    const app = this.container.querySelector('.radio-app');

    // Play/Pause
    app.querySelector('.radio-play-btn').addEventListener('click', () => {
      if (this.playState === 'playing') {
        this._stop();
      } else if (this.currentStation) {
        this._play(this.currentStation);
      }
    });

    // Mute
    app.querySelector('.radio-mute-btn').addEventListener('click', () => {
      this.audio.muted = !this.audio.muted;
      this._updateMuteButton();
    });

    // Visualizer toggle
    app.querySelector('.radio-viz-btn').addEventListener('click', () => {
      this.visualizerEnabled = !this.visualizerEnabled;
      this.storage.set('visualizerEnabled', this.visualizerEnabled);
      app.querySelector('.radio-viz-btn').classList.toggle('active', this.visualizerEnabled);
      this._vizCanvas.classList.toggle('hidden', !this.visualizerEnabled);
      if (this.visualizerEnabled && (this.playState === 'playing' || this.playState === 'loading')) {
        this._startVisualizer();
      } else if (!this.visualizerEnabled) {
        this._stopVisualizer();
      }
    });

    // Volume
    const volumeSlider = app.querySelector('.radio-volume');
    volumeSlider.addEventListener('input', (e) => {
      this.volume = parseInt(e.target.value);
      this.audio.volume = this.volume / 100;
      if (this.audio.muted && this.volume > 0) {
        this.audio.muted = false;
        this._updateMuteButton();
      }
      this.storage.set('volume', this.volume);
    });

    // Presets
    app.querySelector('.radio-presets').addEventListener('click', (e) => {
      const btn = e.target.closest('.radio-preset-btn');
      if (!btn) return;
      const idx = parseInt(btn.dataset.index);
      if (this.presets[idx]) {
        this._play(this.presets[idx]);
      }
    });

    app.querySelector('.radio-presets').addEventListener('contextmenu', (e) => {
      const btn = e.target.closest('.radio-preset-btn');
      if (!btn) return;
      e.preventDefault();
      const idx = parseInt(btn.dataset.index);
      const items = [];
      if (this.currentStation) {
        items.push({
          label: `Assign "${this._truncate(this.currentStation.name, 20)}"`,
          action: () => this._assignPreset(idx, this.currentStation)
        });
      }
      if (this.presets[idx]) {
        items.push({
          label: 'Clear preset',
          action: () => this._assignPreset(idx, null)
        });
      }
      if (items.length) {
        ContextMenu.show(e.clientX, e.clientY, items);
      }
    });

    // Collapse toggle
    app.querySelector('.radio-collapse-toggle').addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      app.querySelector('.radio-browse').classList.toggle('collapsed', this.collapsed);
      this.storage.set('collapsed', this.collapsed);
      this._resizeWindow();
    });

    // Tabs
    app.querySelectorAll('.radio-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab;
        app.querySelectorAll('.radio-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === this.activeTab));
        app.querySelectorAll('.radio-tab-content').forEach(c => {
          c.style.display = c.dataset.tab === this.activeTab ? '' : 'none';
        });
      });
    });

    // Station list actions
    app.querySelector('.radio-station-list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx);
      if (btn.dataset.action === 'play') {
        this._play(this.stations[idx]);
      } else if (btn.dataset.action === 'preset') {
        this._showPresetPicker(btn, this.stations[idx]);
      } else if (btn.dataset.action === 'remove') {
        this.stations.splice(idx, 1);
        this.storage.set('stations', this.stations);
        this._refreshStationList();
      }
    });

    // Search
    const searchInput = app.querySelector('.radio-search-input');
    searchInput.addEventListener('input', () => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this._search(searchInput.value.trim());
      }, this.SEARCH_DELAY);
    });

    // Search results actions
    app.querySelector('.radio-search-results').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const url = btn.dataset.url;
      const resultEl = btn.closest('.radio-search-result');
      const station = this._parseStationFromEl(resultEl);
      if (btn.dataset.action === 'play') {
        this._play(station);
      } else if (btn.dataset.action === 'save') {
        if (!this.stations.find(s => s.url === station.url)) {
          this.stations.push(station);
          this.storage.set('stations', this.stations);
          this._refreshStationList();
          btn.textContent = 'Saved';
          btn.disabled = true;
        }
      }
    });

    // Audio events
    this.audio.addEventListener('playing', () => {
      this.playState = 'playing';
      this._updatePlayButton();
      this._setStatus('');
    });

    this.audio.addEventListener('waiting', () => {
      this._setStatus('Buffering...');
    });

    this.audio.addEventListener('error', () => {
      if (!this.audio.src || this.playState === 'idle') return;
      this.playState = 'error';
      this._updatePlayButton();
      this._setStatus('Failed to load stream');
    });

    // Keyboard shortcuts
    this._keyHandler = (e) => {
      if (!this.container.closest('.window.active')) return;
      if (e.target.tagName === 'INPUT') return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= 6 && this.presets[num - 1]) {
        this._play(this.presets[num - 1]);
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  },

  _play(station) {
    this.currentStation = station;
    this.playState = 'loading';
    this._updateNowPlaying();
    this._updatePlayButton();
    this._setStatus('Loading...');
    this._highlightActive();

    this.audio.src = station.url;
    this.audio.load();
    this.audio.play().catch(() => {
      this.playState = 'error';
      this._updatePlayButton();
      this._setStatus('Playback failed');
    });

    this.storage.set('lastStation', station);
    this._updatePageTitle();

    if (this.visualizerEnabled) {
      this._initAudioContext();
      this._startVisualizer();
    }
  },

  _stop() {
    this.playState = 'idle';
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this._updatePlayButton();
    this._setStatus('');
    this._highlightActive();
    this._stopVisualizer();
    this._updatePageTitle();
  },

  _resizeWindow() {
    if (!WindowManager.windows) return;
    const windowData = WindowManager.windows.get(this.id);
    if (!windowData || windowData.state.maximized) return;
    const windowEl = windowData.element;
    if (this.collapsed) {
      const headerHeight = windowEl.querySelector('.window-header').offsetHeight;
      const playerHeight = this.container.querySelector('.radio-player').offsetHeight;
      const presetsHeight = this.container.querySelector('.radio-presets').offsetHeight;
      const toggleHeight = this.container.querySelector('.radio-collapse-toggle').offsetHeight;
      const newHeight = headerHeight + playerHeight + presetsHeight + toggleHeight + 1;
      // Only save expanded height if current height is actually larger than collapsed
      if (windowData.state.height > newHeight) {
        this._expandedHeight = windowData.state.height;
      }
      this.minSize = { width: this.minSize.width, height: newHeight };
      windowData.state.height = newHeight;
      windowEl.style.height = `${newHeight}px`;
    } else {
      this.minSize = { width: 320, height: 420 };
      const targetHeight = this._expandedHeight || this.defaultSize.height;
      windowData.state.height = targetHeight;
      windowEl.style.height = `${targetHeight}px`;
    }
    WindowManager._saveState(this.id);
  },

  _updateNowPlaying() {
    const nameEl = this.container.querySelector('.radio-station-name');
    const metaEl = this.container.querySelector('.radio-station-meta');
    const artEl = this.container.querySelector('.radio-artwork');
    if (this.currentStation) {
      nameEl.textContent = this.currentStation.name;
      metaEl.textContent = this._formatMeta(this.currentStation);
      artEl.title = this.currentStation.name;
      artEl.innerHTML = this._renderArtwork(this.currentStation);
    } else {
      nameEl.textContent = 'No station selected';
      metaEl.textContent = '';
      artEl.title = '';
      artEl.innerHTML = this._renderArtwork(null);
    }
  },

  _updatePlayButton() {
    const btn = this.container.querySelector('.radio-play-btn');
    if (!btn) return;
    const isPlaying = this.playState === 'playing' || this.playState === 'loading';
    btn.innerHTML = isPlaying
      ? `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="5,3 19,12 5,21"/></svg>`;
    btn.classList.toggle('playing', isPlaying);

    // Update preset button highlights
    this.container.querySelectorAll('.radio-preset-btn').forEach((btn, i) => {
      btn.classList.toggle('active', this.presets[i] && this.currentStation && this.presets[i].url === this.currentStation.url && isPlaying);
    });
  },

  _updateMuteButton() {
    const btn = this.container.querySelector('.radio-mute-btn');
    if (!btn) return;
    if (this.audio.muted) {
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor"/>
        <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
      </svg>`;
    } else {
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      </svg>`;
    }
  },

  _setStatus(msg) {
    const el = this.container.querySelector('.radio-status');
    if (el) el.textContent = msg;
  },

  _showPresetPicker(anchorEl, station) {
    const rect = anchorEl.getBoundingClientRect();
    const items = this.presets.map((p, i) => ({
      label: `${i + 1}: ${p ? this._truncate(p.name, 20) : '(empty)'}`,
      action: () => this._assignPreset(i, station)
    }));
    ContextMenu.show(rect.left, rect.bottom, items);
  },

  _isStationPreset(station) {
    return this.presets.some(p => p && p.url === station.url);
  },

  _assignPreset(idx, station) {
    this.presets[idx] = station;
    this.storage.set('presets', this.presets);
    this._refreshPresets();
    this._refreshStationList();
  },

  _refreshPresets() {
    const presetsEl = this.container.querySelector('.radio-presets');
    presetsEl.innerHTML = this.presets.map((p, i) => `
      <button class="radio-preset-btn${this._isPresetActive(i) ? ' active' : ''}" data-index="${i}" title="${p ? this._escapeHtml(p.name) : `Preset ${i + 1} (empty)`}">
        <span class="radio-preset-num">${i + 1}</span>
        <span class="radio-preset-name">${p ? this._escapeHtml(this._truncate(p.name, 12)) : ''}</span>
      </button>
    `).join('');
  },

  _isPresetActive(i) {
    const isPlaying = this.playState === 'playing' || this.playState === 'loading';
    return this.presets[i] && this.currentStation && this.presets[i].url === this.currentStation.url && isPlaying;
  },

  _refreshStationList() {
    const listEl = this.container.querySelector('.radio-station-list');
    if (listEl) listEl.innerHTML = this._renderStationList();
  },

  _renderStationList() {
    if (!this.stations.length) {
      return '<div class="radio-empty">No saved stations. Search and save stations to build your library.</div>';
    }
    return this.stations.map((s, i) => `
      <div class="radio-station-item${this.currentStation && this.currentStation.url === s.url ? ' active' : ''}" data-url="${this._escapeHtml(s.url)}">
        <div class="radio-station-info">
          <div class="radio-station-item-name">${this._escapeHtml(s.name)}</div>
          <div class="radio-station-item-meta">${this._formatMeta(s)}</div>
        </div>
        <div class="radio-station-actions">
          <button data-action="play" data-idx="${i}" title="Play">&#9654;</button>
          <button data-action="preset" data-idx="${i}" title="Set as preset" class="${this._isStationPreset(s) ? 'radio-preset-active' : ''}">&#9733;</button>
          <button data-action="remove" data-idx="${i}" title="Remove">&times;</button>
        </div>
      </div>
    `).join('');
  },

  _highlightActive() {
    this.container.querySelectorAll('.radio-station-item').forEach(el => {
      el.classList.toggle('active', this.currentStation && el.dataset.url === this.currentStation.url && this.playState !== 'idle');
    });
    this.container.querySelectorAll('.radio-search-result').forEach(el => {
      el.classList.toggle('active', this.currentStation && el.dataset.url === this.currentStation.url && this.playState !== 'idle');
    });
  },

  async _search(query) {
    if (!query) {
      this.container.querySelector('.radio-search-results').innerHTML = '';
      return;
    }

    const resultsEl = this.container.querySelector('.radio-search-results');
    resultsEl.innerHTML = '<div class="radio-loading">Searching...</div>';

    try {
      const encoded = encodeURIComponent(query);
      const res = await fetch(`https://de1.api.radio-browser.info/json/stations/byname/${encoded}?limit=20&order=votes&reverse=true`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();

      if (!data.length) {
        resultsEl.innerHTML = '<div class="radio-empty">No stations found.</div>';
        return;
      }

      const savedUrls = new Set(this.stations.map(s => s.url));
      resultsEl.innerHTML = data
        .filter(s => s.url_resolved || s.url)
        .map(s => {
          const station = {
            name: s.name,
            url: s.url_resolved || s.url,
            favicon: s.favicon || '',
            country: s.countrycode || s.country || '',
            tags: s.tags || '',
            bitrate: s.bitrate || 0,
            votes: s.votes || 0
          };
          const isSaved = savedUrls.has(station.url);
          return `
            <div class="radio-search-result" data-url="${this._escapeHtml(station.url)}" data-name="${this._escapeHtml(station.name)}" data-favicon="${this._escapeHtml(station.favicon)}" data-country="${this._escapeHtml(station.country)}" data-tags="${this._escapeHtml(station.tags)}" data-bitrate="${station.bitrate}" data-votes="${station.votes}">
              <div class="radio-station-info">
                <div class="radio-station-item-name">${this._escapeHtml(station.name)}</div>
                <div class="radio-station-item-meta">${this._formatMeta(station)}</div>
              </div>
              <div class="radio-station-actions">
                <button data-action="play" data-url="${this._escapeHtml(station.url)}" title="Play">&#9654;</button>
                <button data-action="save" data-url="${this._escapeHtml(station.url)}" title="Save" ${isSaved ? 'disabled' : ''}>${isSaved ? 'Saved' : 'Save'}</button>
              </div>
            </div>
          `;
        }).join('');
    } catch (e) {
      resultsEl.innerHTML = '<div class="radio-empty">Search unavailable. Try again later.</div>';
    }
  },

  _parseStationFromEl(el) {
    return {
      name: el.dataset.name,
      url: el.dataset.url,
      favicon: el.dataset.favicon || '',
      country: el.dataset.country || '',
      tags: el.dataset.tags || '',
      bitrate: parseInt(el.dataset.bitrate) || 0,
      votes: parseInt(el.dataset.votes) || 0
    };
  },

  _formatMeta(station) {
    const parts = [];
    if (station.country) parts.push(station.country);
    if (station.tags) parts.push(station.tags.split(',').slice(0, 2).join(', '));
    if (station.bitrate) parts.push(`${station.bitrate}kbps`);
    if (station.votes) parts.push(`\u2764 ${station.votes.toLocaleString()}`);
    return parts.join(' \u00b7 ');
  },

  _truncate(str, len) {
    return str.length > len ? str.slice(0, len) + '\u2026' : str;
  },

  _renderArtwork(station) {
    if (station && station.favicon) {
      return `<img class="radio-artwork-img" src="${this._escapeHtml(station.favicon)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="radio-artwork-placeholder" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/><circle cx="12" cy="12" r="2"/></svg></div>`;
    }
    return `<div class="radio-artwork-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/><circle cx="12" cy="12" r="2"/></svg></div>`;
  },

  _initAudioContext() {
    if (this._audioCtx) return;
    this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this._analyser = this._audioCtx.createAnalyser();
    this._analyser.fftSize = 2048;
    this._vizDataArray = new Uint8Array(this._analyser.frequencyBinCount);
    this._sourceNode = this._audioCtx.createMediaElementSource(this.audio);
    this._sourceNode.connect(this._analyser);
    this._analyser.connect(this._audioCtx.destination);
  },

  _startVisualizer() {
    if (this._vizRaf) return;
    this._initAudioContext();
    const canvas = this._vizCanvas;
    const ctx = this._vizCtx;
    const style = VisualizerStyles[this.visualizerStyle] || VisualizerStyles.wispy;
    const startTime = performance.now();

    const draw = () => {
      this._vizRaf = requestAnimationFrame(draw);

      // Size canvas to container
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      this._analyser.getByteTimeDomainData(this._vizDataArray);

      // Detect CORS-blocked flat line (all 128s)
      let isFlat = true;
      for (let i = 0; i < this._vizDataArray.length; i++) {
        if (this._vizDataArray[i] !== 128) { isFlat = false; break; }
      }

      const elapsed = (performance.now() - startTime) / 1000;

      if (isFlat) {
        // Generate gentle idle sine wave
        for (let i = 0; i < this._vizDataArray.length; i++) {
          const t = i / this._vizDataArray.length;
          this._vizDataArray[i] = 128 + Math.sin(t * Math.PI * 4 + elapsed * 2) * 8
            + Math.sin(t * Math.PI * 7 + elapsed * 1.3) * 4;
        }
      }

      style.draw(ctx, this._vizDataArray, w, h, elapsed);
    };

    draw();
  },

  _stopVisualizer() {
    if (this._vizRaf) {
      cancelAnimationFrame(this._vizRaf);
      this._vizRaf = null;
    }
    if (this._vizCtx && this._vizCanvas) {
      const dpr = window.devicePixelRatio || 1;
      this._vizCtx.clearRect(0, 0, this._vizCanvas.width / dpr, this._vizCanvas.height / dpr);
    }
  },

  _updatePageTitle() {
    const isPlaying = this.playState === 'playing' || this.playState === 'loading';
    if (isPlaying && this.currentStation) {
      document.title = `📡 ${this.currentStation.name} — DumbOS`;
    } else {
      document.title = 'DumbOS';
    }
  },

  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

export default RadioModule;
