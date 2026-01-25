/**
 * System Info Module - Browser and system information
 */
const SysInfoModule = {
  id: 'sysinfo',
  title: 'System Info',
  category: 'tools',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  defaultSize: { width: 320, height: 480 },
  minSize: { width: 280, height: 300 },

  container: null,
  intervalId: null,

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this._buildUI();
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="sysinfo-container">
        <div class="sysinfo-section">
          <h3 class="sysinfo-section-title">Display</h3>
          <div class="sysinfo-grid">
            <div class="sysinfo-item">
              <span class="sysinfo-label">Screen</span>
              <span class="sysinfo-value" data-info="screen"></span>
            </div>
            <div class="sysinfo-item">
              <span class="sysinfo-label">Window</span>
              <span class="sysinfo-value" data-info="window"></span>
            </div>
            <div class="sysinfo-item">
              <span class="sysinfo-label">Pixel Ratio</span>
              <span class="sysinfo-value" data-info="dpr"></span>
            </div>
            <div class="sysinfo-item">
              <span class="sysinfo-label">Color Depth</span>
              <span class="sysinfo-value" data-info="color"></span>
            </div>
          </div>
        </div>

        <div class="sysinfo-section">
          <h3 class="sysinfo-section-title">Browser</h3>
          <div class="sysinfo-grid">
            <div class="sysinfo-item">
              <span class="sysinfo-label">User Agent</span>
              <span class="sysinfo-value sysinfo-value-small" data-info="ua"></span>
            </div>
            <div class="sysinfo-item">
              <span class="sysinfo-label">Language</span>
              <span class="sysinfo-value" data-info="lang"></span>
            </div>
            <div class="sysinfo-item">
              <span class="sysinfo-label">Cookies</span>
              <span class="sysinfo-value" data-info="cookies"></span>
            </div>
            <div class="sysinfo-item">
              <span class="sysinfo-label">Online</span>
              <span class="sysinfo-value" data-info="online"></span>
            </div>
          </div>
        </div>

        <div class="sysinfo-section">
          <h3 class="sysinfo-section-title">Hardware</h3>
          <div class="sysinfo-grid">
            <div class="sysinfo-item">
              <span class="sysinfo-label">CPU Cores</span>
              <span class="sysinfo-value" data-info="cores"></span>
            </div>
            <div class="sysinfo-item">
              <span class="sysinfo-label">Memory</span>
              <span class="sysinfo-value" data-info="memory"></span>
            </div>
            <div class="sysinfo-item">
              <span class="sysinfo-label">Touch</span>
              <span class="sysinfo-value" data-info="touch"></span>
            </div>
            <div class="sysinfo-item">
              <span class="sysinfo-label">Platform</span>
              <span class="sysinfo-value" data-info="platform"></span>
            </div>
          </div>
        </div>

        <div class="sysinfo-section">
          <h3 class="sysinfo-section-title">Storage</h3>
          <div class="sysinfo-grid">
            <div class="sysinfo-item">
              <span class="sysinfo-label">LocalStorage</span>
              <span class="sysinfo-value" data-info="localstorage"></span>
            </div>
            <div class="sysinfo-item">
              <span class="sysinfo-label">Quota</span>
              <span class="sysinfo-value" data-info="quota"></span>
            </div>
            <div class="sysinfo-item">
              <span class="sysinfo-label">DumbOS Usage</span>
              <span class="sysinfo-value" data-info="dumbos-usage"></span>
            </div>
            <div class="sysinfo-item">
              <span class="sysinfo-label">Largest</span>
              <span class="sysinfo-value" data-info="largest-module"></span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  render() {
    this._updateInfo();
    this._updateStorageInfo();
    // Update window size on resize
    this.intervalId = setInterval(() => this._updateDynamicInfo(), 1000);
  },

  _updateInfo() {
    const info = this._gatherInfo();

    // Display
    this._setValue('screen', `${info.screenWidth} × ${info.screenHeight}`);
    this._setValue('window', `${info.windowWidth} × ${info.windowHeight}`);
    this._setValue('dpr', `${info.devicePixelRatio}x`);
    this._setValue('color', `${info.colorDepth}-bit`);

    // Browser
    this._setValue('ua', info.userAgent);
    this._setValue('lang', info.language);
    this._setValue('cookies', info.cookiesEnabled ? 'Enabled' : 'Disabled');
    this._setValue('online', info.online ? 'Yes' : 'No');

    // Hardware
    this._setValue('cores', info.cpuCores || 'Unknown');
    this._setValue('memory', info.memory ? `${info.memory} GB` : 'Unknown');
    this._setValue('touch', info.touchSupport ? 'Yes' : 'No');
    this._setValue('platform', info.platform);

    // Storage
    this._setValue('localstorage', info.localStorageUsed);
  },

  _updateDynamicInfo() {
    this._setValue('window', `${window.innerWidth} × ${window.innerHeight}`);
    this._setValue('online', navigator.onLine ? 'Yes' : 'No');
    this._setValue('localstorage', this._getLocalStorageSize());
    this._updateStorageInfo();
  },

  _setValue(key, value) {
    const el = this.container.querySelector(`[data-info="${key}"]`);
    if (el) el.textContent = value;
  },

  _gatherInfo() {
    return {
      // Display
      screenWidth: screen.width,
      screenHeight: screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio.toFixed(2),
      colorDepth: screen.colorDepth,

      // Browser
      userAgent: this._parseUserAgent(),
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      online: navigator.onLine,

      // Hardware
      cpuCores: navigator.hardwareConcurrency,
      memory: navigator.deviceMemory,
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      platform: this._parsePlatform(),

      // Storage
      localStorageUsed: this._getLocalStorageSize()
    };
  },

  _parseUserAgent() {
    const ua = navigator.userAgent;

    if (ua.includes('Firefox/')) {
      const match = ua.match(/Firefox\/(\d+)/);
      return `Firefox ${match ? match[1] : ''}`;
    }
    if (ua.includes('Edg/')) {
      const match = ua.match(/Edg\/(\d+)/);
      return `Edge ${match ? match[1] : ''}`;
    }
    if (ua.includes('Chrome/')) {
      const match = ua.match(/Chrome\/(\d+)/);
      return `Chrome ${match ? match[1] : ''}`;
    }
    if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      const match = ua.match(/Version\/(\d+)/);
      return `Safari ${match ? match[1] : ''}`;
    }

    return 'Unknown';
  },

  _parsePlatform() {
    const platform = navigator.platform || '';
    const ua = navigator.userAgent;

    if (platform.includes('Win')) return 'Windows';
    if (platform.includes('Mac')) return 'macOS';
    if (platform.includes('Linux')) return 'Linux';
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
    if (/Android/.test(ua)) return 'Android';

    return platform || 'Unknown';
  },

  _getLocalStorageSize() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    const kb = (total * 2 / 1024).toFixed(1);
    return `${kb} KB`;
  },

  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  async _getStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        return { usage: estimate.usage || 0, quota: estimate.quota || 0 };
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  _getDumbOSBreakdown() {
    const breakdown = {};
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith('dumbos:')) {
        const parts = key.split(':');
        const namespace = parts[1] || 'unknown';
        const size = (localStorage[key].length + key.length) * 2; // UTF-16 chars = 2 bytes each
        breakdown[namespace] = (breakdown[namespace] || 0) + size;
      }
    }
    // Sort by size descending
    return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  },

  async _updateStorageInfo() {
    // Update quota info
    const quota = await this._getStorageQuota();
    if (quota && quota.quota > 0) {
      const usageStr = this._formatBytes(quota.usage);
      const quotaStr = this._formatBytes(quota.quota);
      this._setValue('quota', `${usageStr} / ${quotaStr}`);
    } else {
      this._setValue('quota', 'Unavailable');
    }

    // Update DumbOS breakdown
    const breakdown = this._getDumbOSBreakdown();
    const totalDumbOS = breakdown.reduce((sum, [, bytes]) => sum + bytes, 0);
    this._setValue('dumbos-usage', this._formatBytes(totalDumbOS));

    // Update largest module
    if (breakdown.length > 0) {
      const [largestNamespace, largestBytes] = breakdown[0];
      this._setValue('largest-module', `${largestNamespace} (${this._formatBytes(largestBytes)})`);
    } else {
      this._setValue('largest-module', 'None');
    }
  },

  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
};

export default SysInfoModule;
