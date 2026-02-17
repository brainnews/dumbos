/**
 * YouTube Module - Play YouTube videos with playlist support
 */
const YouTubeModule = {
  id: 'youtube',
  title: 'YouTube',
  category: 'entertainment',
  description: 'Play videos and playlists',
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.5v-7l6.3 3.5-6.3 3.5z"/></svg>`,
  defaultSize: { width: 340, height: 580 },
  minSize: { width: 300, height: 480 },

  container: null,
  storage: null,
  player: null,
  _originalTitle: null,
  queue: [],
  currentIndex: -1,
  volume: 80,
  progressInterval: null,
  apiReady: false,
  isSeeking: false,
  playlists: [],
  showingPlaylists: false,
  savedTimes: {},
  pendingSeek: null,

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this.queue = storage.get('queue', []);
    this.currentIndex = storage.get('currentIndex', -1);
    this.volume = storage.get('volume', 80);
    this.playlists = storage.get('playlists', []);
    this.savedTimes = storage.get('savedTimes', {});
    this._buildUI();
    this._loadYouTubeAPI();
  },

  render() {},

  destroy() {
    // Save current playback position before closing
    this._saveCurrentTime();
    this._restorePageTitle();

    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    this.apiReady = false;
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="yt-player">
        <div class="yt-video-area">
          <div id="yt-player-target"></div>
          <div class="yt-loading-overlay">Loading player...</div>
        </div>
        <div class="yt-track-info">
          <span class="yt-track-title">No track loaded</span>
          <span class="yt-track-author"></span>
        </div>
        <div class="yt-seek-row">
          <span class="yt-time-current">0:00</span>
          <input type="range" class="yt-seek-bar" min="0" max="100" value="0">
          <span class="yt-time-duration">0:00</span>
        </div>
        <div class="yt-controls">
          <button class="yt-btn yt-btn-prev" title="Previous">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
          </button>
          <button class="yt-btn yt-btn-play" title="Play">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
          <button class="yt-btn yt-btn-next" title="Next">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
          </button>
          <div class="yt-volume-group">
            <button class="yt-btn yt-btn-vol" title="Mute">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </button>
            <input type="range" class="yt-volume-slider" min="0" max="100" value="${this.volume}">
          </div>
        </div>
        <div class="yt-url-row">
          <input type="text" class="yt-url-input" placeholder="Paste YouTube URL...">
          <button class="yt-btn yt-btn-add" title="Add to queue">+</button>
        </div>
        <div class="yt-error-msg"></div>
        <div class="yt-tabs">
          <button class="yt-tab active" data-tab="queue">Queue</button>
          <button class="yt-tab" data-tab="playlists">Playlists</button>
        </div>
        <div class="yt-tab-content">
          <div class="yt-queue yt-tab-panel active" data-panel="queue">
            <div class="yt-queue-actions">
              <button class="yt-btn-small yt-btn-save" title="Save as playlist">Save Playlist</button>
              <button class="yt-btn-small yt-btn-clear" title="Clear queue">Clear</button>
            </div>
            <div class="yt-queue-list"></div>
          </div>
          <div class="yt-playlists yt-tab-panel" data-panel="playlists">
            <div class="yt-playlists-list"></div>
          </div>
        </div>
      </div>
      <div class="yt-dialog" style="display: none;">
        <div class="yt-dialog-content">
          <div class="yt-dialog-title">Save Playlist</div>
          <input type="text" class="yt-dialog-input" placeholder="Playlist name...">
          <div class="yt-dialog-actions">
            <button class="yt-btn-small yt-dialog-cancel">Cancel</button>
            <button class="yt-btn-small yt-btn-primary yt-dialog-save">Save</button>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
    this._renderQueue();
    this._renderPlaylists();
  },

  _bindEvents() {
    const playBtn = this.container.querySelector('.yt-btn-play');
    const prevBtn = this.container.querySelector('.yt-btn-prev');
    const nextBtn = this.container.querySelector('.yt-btn-next');
    const volBtn = this.container.querySelector('.yt-btn-vol');
    const volSlider = this.container.querySelector('.yt-volume-slider');
    const seekBar = this.container.querySelector('.yt-seek-bar');
    const addBtn = this.container.querySelector('.yt-btn-add');
    const urlInput = this.container.querySelector('.yt-url-input');
    const saveBtn = this.container.querySelector('.yt-btn-save');
    const clearBtn = this.container.querySelector('.yt-btn-clear');
    const tabs = this.container.querySelectorAll('.yt-tab');

    playBtn.addEventListener('click', () => this._togglePlay());
    prevBtn.addEventListener('click', () => this._prevTrack());
    nextBtn.addEventListener('click', () => this._nextTrack());

    volBtn.addEventListener('click', () => {
      if (this.player) {
        if (this.player.isMuted()) {
          this.player.unMute();
          volSlider.value = this.volume;
        } else {
          this.player.mute();
          volSlider.value = 0;
        }
        this._updateVolumeIcon();
      }
    });

    volSlider.addEventListener('input', (e) => {
      this.volume = parseInt(e.target.value);
      if (this.player) {
        this.player.unMute();
        this.player.setVolume(this.volume);
      }
      this.storage.set('volume', this.volume);
      this._updateVolumeIcon();
    });

    seekBar.addEventListener('mousedown', () => { this.isSeeking = true; });
    seekBar.addEventListener('touchstart', () => { this.isSeeking = true; });
    seekBar.addEventListener('input', (e) => {
      if (this.player && this.player.getDuration) {
        const time = (e.target.value / 100) * this.player.getDuration();
        this.container.querySelector('.yt-time-current').textContent = this._formatTime(time);
      }
    });
    seekBar.addEventListener('change', (e) => {
      this.isSeeking = false;
      if (this.player && this.player.getDuration) {
        const time = (e.target.value / 100) * this.player.getDuration();
        this.player.seekTo(time, true);
      }
    });

    addBtn.addEventListener('click', () => this._addFromInput());
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._addFromInput();
    });

    // Playlist actions
    saveBtn.addEventListener('click', () => this._showSaveDialog());
    clearBtn.addEventListener('click', () => this._clearQueue());

    // Tab switching
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        this.container.querySelectorAll('.yt-tab-panel').forEach(p => {
          p.classList.toggle('active', p.dataset.panel === tabName);
        });
      });
    });

    // Dialog events
    const dialog = this.container.querySelector('.yt-dialog');
    const dialogInput = this.container.querySelector('.yt-dialog-input');
    const cancelBtn = this.container.querySelector('.yt-dialog-cancel');
    const dialogSaveBtn = this.container.querySelector('.yt-dialog-save');

    cancelBtn.addEventListener('click', () => this._hideDialog());
    dialogSaveBtn.addEventListener('click', () => this._savePlaylist());
    dialogInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._savePlaylist();
      if (e.key === 'Escape') this._hideDialog();
    });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) this._hideDialog();
    });
  },

  _loadYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      this._onAPIReady();
      return;
    }

    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        this._onAPIReady();
      };
      return;
    }

    window.onYouTubeIframeAPIReady = () => this._onAPIReady();
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  },

  _onAPIReady() {
    this.apiReady = true;
    this._initPlayer();
  },

  _initPlayer() {
    const target = this.container.querySelector('#yt-player-target');
    if (!target) return;

    this.player = new YT.Player(target, {
      height: '100%',
      width: '100%',
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1
      },
      events: {
        onReady: () => this._onPlayerReady(),
        onStateChange: (e) => this._onStateChange(e),
        onError: (e) => this._onPlayerError(e)
      }
    });
  },

  _onPlayerReady() {
    const overlay = this.container.querySelector('.yt-loading-overlay');
    if (overlay) overlay.style.display = 'none';

    this.player.setVolume(this.volume);

    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      const track = this.queue[this.currentIndex];
      // Set pending seek for saved position
      this.pendingSeek = this.savedTimes[track.videoId] || null;
      this.player.cueVideoById(track.videoId);
      this._updateTrackInfo();
    }
  },

  _onStateChange(event) {
    const state = event.data;

    if (state === YT.PlayerState.PLAYING) {
      // Restore saved position when video starts playing
      if (this.pendingSeek !== null) {
        this.player.seekTo(this.pendingSeek, true);
        this.pendingSeek = null;
      }
      this._updatePlayButton(true);
      this._startProgressUpdates();
    } else if (state === YT.PlayerState.PAUSED) {
      this._updatePlayButton(false);
      this._stopProgressUpdates();
      this._saveCurrentTime();
    } else if (state === YT.PlayerState.ENDED) {
      this._updatePlayButton(false);
      this._stopProgressUpdates();
      // Clear saved time when video ends
      this._clearSavedTime();
      this._nextTrack();
    } else if (state === YT.PlayerState.BUFFERING) {
      this._updatePlayButton(true);
    }
  },

  _onPlayerError(event) {
    const titleEl = this.container.querySelector('.yt-track-title');
    titleEl.textContent = 'Video unavailable';
    setTimeout(() => this._nextTrack(), 2000);
  },

  _parseURL(url) {
    const videoMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    const playlistMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);

    if (playlistMatch) {
      return { type: 'playlist', playlistId: playlistMatch[1], videoId: videoMatch ? videoMatch[1] : null };
    }
    if (videoMatch) {
      return { type: 'video', videoId: videoMatch[1] };
    }
    return null;
  },

  async _addFromInput() {
    const input = this.container.querySelector('.yt-url-input');
    const url = input.value.trim();
    if (!url) return;

    const parsed = this._parseURL(url);
    if (!parsed) {
      this._showError('Invalid YouTube URL');
      return;
    }

    input.value = '';

    if (parsed.type === 'playlist') {
      await this._addPlaylist(parsed.playlistId);
    } else {
      await this._addVideo(parsed.videoId, url);
    }
  },

  async _addVideo(videoId, url) {
    const existing = this.queue.find(t => t.videoId === videoId);
    if (existing) {
      this._showError('Already in queue');
      return;
    }

    const info = await this._fetchOEmbed(videoId);
    const track = {
      videoId,
      title: info.title || 'Unknown',
      author: info.author_name || '',
      url: url || `https://www.youtube.com/watch?v=${videoId}`
    };

    this.queue.push(track);
    this._saveQueue();
    this._renderQueue();

    if (this.queue.length === 1) {
      this._playTrack(0);
    }
  },

  async _addPlaylist(playlistId) {
    if (!this.player || !this.apiReady) {
      this._showError('Player not ready');
      return;
    }

    // Show loading state
    this._showError('Loading playlist...');

    // Store current state to restore later
    const wasPlaying = this.currentIndex >= 0;
    const currentVideoId = wasPlaying ? this.queue[this.currentIndex]?.videoId : null;

    // Cue the playlist
    this.player.cuePlaylist({ list: playlistId, listType: 'playlist' });

    // Wait for playlist to load with timeout
    let videoIds = null;
    const maxAttempts = 20; // 10 seconds max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const list = this.player.getPlaylist();
      if (list && list.length > 0) {
        videoIds = list;
        break;
      }
    }

    if (!videoIds || videoIds.length === 0) {
      this._showError('Could not load playlist');
      // Restore previous video if we had one
      if (currentVideoId) {
        this.player.cueVideoById(currentVideoId);
      }
      return;
    }

    // Clear the loading message
    this.container.querySelector('.yt-error-msg').style.display = 'none';

    const startIndex = this.queue.length;
    let addedCount = 0;

    // Add all videos from playlist
    for (const vid of videoIds) {
      if (!this.queue.find(t => t.videoId === vid)) {
        const info = await this._fetchOEmbed(vid);
        this.queue.push({
          videoId: vid,
          title: info.title || 'Unknown',
          author: info.author_name || '',
          url: `https://www.youtube.com/watch?v=${vid}`
        });
        addedCount++;
        // Update queue display periodically for large playlists
        if (addedCount % 5 === 0) {
          this._renderQueue();
        }
      }
    }

    this._saveQueue();
    this._renderQueue();

    // Restore or start playback
    if (currentVideoId) {
      // Restore the video that was playing before
      this.player.cueVideoById(currentVideoId);
    } else if (this.currentIndex < 0 && this.queue.length > 0) {
      this._playTrack(startIndex);
    }

    this._showError(`Added ${addedCount} videos from playlist`);
  },

  async _fetchOEmbed(videoId) {
    try {
      const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const resp = await fetch(url);
      if (!resp.ok) return {};
      return await resp.json();
    } catch {
      return {};
    }
  },

  _playTrack(index) {
    if (index < 0 || index >= this.queue.length) return;
    this.currentIndex = index;
    this._saveQueue();

    const track = this.queue[index];
    // Check for saved position for this video
    this.pendingSeek = this.savedTimes[track.videoId] || null;

    if (this.player && this.player.loadVideoById) {
      this.player.loadVideoById(track.videoId);
    }
    this._updateTrackInfo();
    this._renderQueue();
  },

  _togglePlay() {
    if (!this.player) return;
    const state = this.player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      this.player.pauseVideo();
    } else if (this.currentIndex >= 0) {
      this.player.playVideo();
    } else if (this.queue.length > 0) {
      this._playTrack(0);
    }
  },

  _nextTrack() {
    if (this.queue.length === 0) return;
    const next = (this.currentIndex + 1) % this.queue.length;
    this._playTrack(next);
  },

  _prevTrack() {
    if (this.queue.length === 0) return;
    const prev = (this.currentIndex - 1 + this.queue.length) % this.queue.length;
    this._playTrack(prev);
  },

  _startProgressUpdates() {
    this._stopProgressUpdates();
    this.progressInterval = setInterval(() => this._updateProgress(), 500);
  },

  _stopProgressUpdates() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  },

  _updateProgress() {
    if (!this.player || !this.player.getCurrentTime || this.isSeeking) return;
    const current = this.player.getCurrentTime();
    const duration = this.player.getDuration();
    if (!duration) return;

    const seekBar = this.container.querySelector('.yt-seek-bar');
    const currentEl = this.container.querySelector('.yt-time-current');
    const durationEl = this.container.querySelector('.yt-time-duration');

    seekBar.value = (current / duration) * 100;
    currentEl.textContent = this._formatTime(current);
    durationEl.textContent = this._formatTime(duration);

    // Save position every 5 seconds
    if (Math.floor(current) % 5 === 0) {
      this._saveCurrentTime();
    }
  },

  _updatePlayButton(playing) {
    const btn = this.container.querySelector('.yt-btn-play');
    if (playing) {
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
      btn.title = 'Pause';
    } else {
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
      btn.title = 'Play';
    }
  },

  _updateVolumeIcon() {
    const btn = this.container.querySelector('.yt-btn-vol');
    const muted = this.player && this.player.isMuted();
    const vol = muted ? 0 : this.volume;

    if (vol === 0) {
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
    } else if (vol < 50) {
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
    } else {
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
    }
  },

  _updateTrackInfo() {
    const titleEl = this.container.querySelector('.yt-track-title');
    const authorEl = this.container.querySelector('.yt-track-author');

    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      const track = this.queue[this.currentIndex];
      titleEl.textContent = track.title;
      authorEl.textContent = track.author;
      this._setPageTitle(track.title);
    } else {
      titleEl.textContent = 'No track loaded';
      authorEl.textContent = '';
      this._restorePageTitle();
    }
  },

  _setPageTitle(trackTitle) {
    if (this._originalTitle === null) {
      this._originalTitle = document.title;
    }
    document.title = `${trackTitle} — DumbOS`;
  },

  _restorePageTitle() {
    if (this._originalTitle !== null) {
      document.title = this._originalTitle;
      this._originalTitle = null;
    }
  },

  _renderQueue() {
    const list = this.container.querySelector('.yt-queue-list');
    if (!list) return;

    if (this.queue.length === 0) {
      list.innerHTML = '<div class="yt-queue-empty">Queue is empty</div>';
      return;
    }

    list.innerHTML = this.queue.map((track, i) => `
      <div class="yt-queue-item ${i === this.currentIndex ? 'active' : ''}" data-index="${i}">
        <span class="yt-queue-item-title">${this._escapeHTML(track.title)}</span>
        <button class="yt-queue-item-remove" data-index="${i}" title="Remove">&times;</button>
      </div>
    `).join('');

    list.querySelectorAll('.yt-queue-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('yt-queue-item-remove')) return;
        this._playTrack(parseInt(item.dataset.index));
      });
    });

    list.querySelectorAll('.yt-queue-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._removeTrack(parseInt(btn.dataset.index));
      });
    });
  },

  _removeTrack(index) {
    this.queue.splice(index, 1);

    if (index === this.currentIndex) {
      if (this.queue.length === 0) {
        this.currentIndex = -1;
        if (this.player) this.player.stopVideo();
        this._updateTrackInfo();
        this._updatePlayButton(false);
        this._stopProgressUpdates();
      } else {
        const next = Math.min(index, this.queue.length - 1);
        this._playTrack(next);
        return;
      }
    } else if (index < this.currentIndex) {
      this.currentIndex--;
    }

    this._saveQueue();
    this._renderQueue();
  },

  _saveQueue() {
    this.storage.set('queue', this.queue);
    this.storage.set('currentIndex', this.currentIndex);
  },

  _showError(msg) {
    const el = this.container.querySelector('.yt-error-msg');
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
  },

  _formatTime(seconds) {
    const s = Math.floor(seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  _escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // Playlist management
  _showSaveDialog() {
    if (this.queue.length === 0) {
      this._showError('Queue is empty');
      return;
    }
    const dialog = this.container.querySelector('.yt-dialog');
    const input = this.container.querySelector('.yt-dialog-input');
    dialog.style.display = 'flex';
    input.value = '';
    input.focus();
  },

  _hideDialog() {
    const dialog = this.container.querySelector('.yt-dialog');
    dialog.style.display = 'none';
  },

  _savePlaylist() {
    const input = this.container.querySelector('.yt-dialog-input');
    const name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }

    const playlist = {
      id: Date.now().toString(),
      name,
      tracks: [...this.queue],
      createdAt: Date.now()
    };

    this.playlists.push(playlist);
    this._savePlaylists();
    this._renderPlaylists();
    this._hideDialog();
  },

  _savePlaylists() {
    this.storage.set('playlists', this.playlists);
  },

  _loadPlaylist(playlistId) {
    const playlist = this.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    this.queue = [...playlist.tracks];
    this.currentIndex = -1;
    this._saveQueue();
    this._renderQueue();

    // Switch to queue tab
    this.container.querySelectorAll('.yt-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === 'queue');
    });
    this.container.querySelectorAll('.yt-tab-panel').forEach(p => {
      p.classList.toggle('active', p.dataset.panel === 'queue');
    });

    if (this.queue.length > 0) {
      this._playTrack(0);
    }
  },

  _deletePlaylist(playlistId) {
    this.playlists = this.playlists.filter(p => p.id !== playlistId);
    this._savePlaylists();
    this._renderPlaylists();
  },

  _renderPlaylists() {
    const list = this.container.querySelector('.yt-playlists-list');
    if (!list) return;

    if (this.playlists.length === 0) {
      list.innerHTML = '<div class="yt-playlists-empty">No saved playlists</div>';
      return;
    }

    list.innerHTML = this.playlists.map(playlist => `
      <div class="yt-playlist-item" data-id="${playlist.id}">
        <div class="yt-playlist-info">
          <span class="yt-playlist-name">${this._escapeHTML(playlist.name)}</span>
          <span class="yt-playlist-count">${playlist.tracks.length} tracks</span>
        </div>
        <div class="yt-playlist-actions">
          <button class="yt-playlist-load" data-id="${playlist.id}" title="Load playlist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
          <button class="yt-playlist-delete" data-id="${playlist.id}" title="Delete playlist">&times;</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.yt-playlist-load').forEach(btn => {
      btn.addEventListener('click', () => this._loadPlaylist(btn.dataset.id));
    });

    list.querySelectorAll('.yt-playlist-delete').forEach(btn => {
      btn.addEventListener('click', () => this._deletePlaylist(btn.dataset.id));
    });
  },

  _clearQueue() {
    if (this.queue.length === 0) return;
    this.queue = [];
    this.currentIndex = -1;
    if (this.player) this.player.stopVideo();
    this._saveQueue();
    this._renderQueue();
    this._updateTrackInfo();
    this._updatePlayButton(false);
    this._stopProgressUpdates();
  },

  // Playback position persistence
  _saveCurrentTime() {
    if (!this.player || !this.player.getCurrentTime) return;
    if (this.currentIndex < 0 || this.currentIndex >= this.queue.length) return;

    const track = this.queue[this.currentIndex];
    const time = this.player.getCurrentTime();

    // Only save if we're past 5 seconds (to avoid saving at the very start)
    if (time > 5) {
      this.savedTimes[track.videoId] = time;
      this.storage.set('savedTimes', this.savedTimes);
    }
  },

  _clearSavedTime() {
    if (this.currentIndex < 0 || this.currentIndex >= this.queue.length) return;
    const track = this.queue[this.currentIndex];
    delete this.savedTimes[track.videoId];
    this.storage.set('savedTimes', this.savedTimes);
  }
};

export default YouTubeModule;
