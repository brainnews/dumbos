/**
 * YouTube Music Player Module - Play YouTube videos in a compact music player UI
 */
const YouTubeModule = {
  id: 'youtube',
  title: 'YouTube Music',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  defaultSize: { width: 320, height: 540 },
  minSize: { width: 280, height: 440 },

  container: null,
  storage: null,
  player: null,
  queue: [],
  currentIndex: -1,
  volume: 80,
  progressInterval: null,
  apiReady: false,
  isSeeking: false,

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this.queue = storage.get('queue', []);
    this.currentIndex = storage.get('currentIndex', -1);
    this.volume = storage.get('volume', 80);
    this._buildUI();
    this._loadYouTubeAPI();
  },

  render() {},

  destroy() {
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
        <div class="yt-queue">
          <div class="yt-queue-header">Queue</div>
          <div class="yt-queue-list"></div>
        </div>
      </div>
    `;

    this._bindEvents();
    this._renderQueue();
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
      this.player.cueVideoById(this.queue[this.currentIndex].videoId);
      this._updateTrackInfo();
    }
  },

  _onStateChange(event) {
    const state = event.data;

    if (state === YT.PlayerState.PLAYING) {
      this._updatePlayButton(true);
      this._startProgressUpdates();
    } else if (state === YT.PlayerState.PAUSED) {
      this._updatePlayButton(false);
      this._stopProgressUpdates();
    } else if (state === YT.PlayerState.ENDED) {
      this._updatePlayButton(false);
      this._stopProgressUpdates();
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

    this.player.cuePlaylist({ list: playlistId, listType: 'playlist' });

    await new Promise(resolve => {
      const check = () => {
        const list = this.player.getPlaylist();
        if (list && list.length > 0) {
          resolve();
        } else {
          setTimeout(check, 500);
        }
      };
      setTimeout(check, 1000);
    });

    const videoIds = this.player.getPlaylist();
    if (!videoIds || videoIds.length === 0) {
      this._showError('Could not load playlist');
      return;
    }

    const startIndex = this.queue.length;
    for (const vid of videoIds) {
      if (!this.queue.find(t => t.videoId === vid)) {
        const info = await this._fetchOEmbed(vid);
        this.queue.push({
          videoId: vid,
          title: info.title || 'Unknown',
          author: info.author_name || '',
          url: `https://www.youtube.com/watch?v=${vid}`
        });
      }
    }

    this._saveQueue();
    this._renderQueue();

    if (this.currentIndex < 0) {
      this._playTrack(startIndex);
    }
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
    } else {
      titleEl.textContent = 'No track loaded';
      authorEl.textContent = '';
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
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  },

  _escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

export default YouTubeModule;
