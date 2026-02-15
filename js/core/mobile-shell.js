/**
 * MobileShell - Phone-style app launcher for mobile devices
 * Opens modules full-screen instead of in windows
 */
import ModuleRegistry from './module-registry.js';
import Storage from './storage.js';

const MOBILE_MODULES = ['radio', 'metmuseum', 'stocktracker', 'notes', 'rss', 'snake', 'bubblewrap', 'settings', 'help'];

class MobileShell {
  constructor() {
    this.desktop = null;
    this.activeModule = null;
    this.homeEl = null;
    this.appViewEl = null;
    this.appContentEl = null;
    this.appBarTitle = null;
    this._clockInterval = null;
  }

  init(desktop) {
    this.desktop = desktop;

    // Hide desktop chrome
    const mobileNotice = document.getElementById('mobile-notice');
    if (mobileNotice) mobileNotice.style.display = 'none';

    this._buildShell();
    this._bindEvents();
    this._startClock();

    // Restore last open app for PWA persistence
    const lastApp = Storage.get('mobile', 'lastApp', null);
    if (lastApp && ModuleRegistry.has(lastApp) && MOBILE_MODULES.includes(lastApp)) {
      this.openApp(lastApp);
    }
  }

  _buildShell() {
    this.desktop.innerHTML = '';

    const shell = document.createElement('div');
    shell.className = 'mobile-shell';
    shell.innerHTML = `
      <div class="mobile-home">
        <div class="mobile-home-header">
          <div class="mobile-clock"></div>
          <div class="mobile-branding">DumbOS</div>
        </div>
        <div class="mobile-app-grid">
          ${this._renderAppIcons()}
        </div>
      </div>
      <div class="mobile-app-view" style="display:none">
        <div class="mobile-app-bar">
          <button class="mobile-back-btn" aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span class="mobile-app-title"></span>
        </div>
        <div class="mobile-app-content"></div>
      </div>
    `;

    this.desktop.appendChild(shell);

    this.homeEl = shell.querySelector('.mobile-home');
    this.appViewEl = shell.querySelector('.mobile-app-view');
    this.appContentEl = shell.querySelector('.mobile-app-content');
    this.appBarTitle = shell.querySelector('.mobile-app-title');
    this._clockEl = shell.querySelector('.mobile-clock');
  }

  _renderAppIcons() {
    return MOBILE_MODULES
      .map(id => {
        const mod = ModuleRegistry.get(id);
        if (!mod) return '';
        const iconHtml = mod.icon.startsWith('<') ? mod.icon : `<span class="mobile-icon-emoji">${mod.icon}</span>`;
        return `
          <button class="mobile-app-icon" data-module="${id}">
            <div class="mobile-icon-wrap">${iconHtml}</div>
            <span class="mobile-icon-label">${mod.title}</span>
          </button>
        `;
      })
      .join('');
  }

  _bindEvents() {
    // App icon taps
    this.homeEl.querySelector('.mobile-app-grid').addEventListener('click', (e) => {
      const btn = e.target.closest('.mobile-app-icon');
      if (!btn) return;
      this.openApp(btn.dataset.module);
    });

    // Back button
    this.appViewEl.querySelector('.mobile-back-btn').addEventListener('click', () => {
      this.closeApp();
    });
  }

  openApp(moduleId) {
    const mod = ModuleRegistry.get(moduleId);
    if (!mod) return;

    // Close any existing app first
    if (this.activeModule) {
      this._destroyActive();
    }

    this.activeModule = mod;
    this.appBarTitle.textContent = mod.title;
    this.appContentEl.innerHTML = '';

    // Show app view, hide home
    this.homeEl.style.display = 'none';
    this.appViewEl.style.display = 'flex';

    // Initialize module with the content container
    if (mod.init) {
      mod.init(this.appContentEl, Storage.module(moduleId));
    }
    if (mod.render) {
      mod.render();
    }

    // Persist for PWA
    Storage.set('mobile', 'lastApp', moduleId);
  }

  closeApp() {
    this._destroyActive();

    // Hide app view, show home
    this.appViewEl.style.display = 'none';
    this.homeEl.style.display = 'flex';

    Storage.remove('mobile', 'lastApp');
  }

  _destroyActive() {
    if (!this.activeModule) return;
    if (this.activeModule.destroy) {
      this.activeModule.destroy();
    }
    this.appContentEl.innerHTML = '';
    this.activeModule = null;
  }

  _startClock() {
    const update = () => {
      const now = new Date();
      const use24 = Storage.get('settings', 'clockFormat', '12') === '24';
      let h = now.getHours();
      let period = '';
      if (!use24) {
        period = h >= 12 ? ' PM' : ' AM';
        h = h % 12 || 12;
      }
      const m = String(now.getMinutes()).padStart(2, '0');
      this._clockEl.textContent = `${h}:${m}${period}`;
    };
    update();
    this._clockInterval = setInterval(update, 10000);
  }

  destroy() {
    this._destroyActive();
    if (this._clockInterval) {
      clearInterval(this._clockInterval);
    }
  }
}

export default new MobileShell();
