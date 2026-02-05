/**
 * Story Mode Module - Ghost user experience launcher
 */
import Storage from '../../core/storage.js';
import GhostEngine from './ghost-engine.js';

const StoryModeModule = {
  id: 'storymode',
  title: 'Story Mode',
  category: 'entertainment',
  description: 'Discover traces of a previous user',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/><path d="M8 15c0 0 1.5-2 4-2s4 2 4 2"/></svg>`,
  defaultSize: { width: 460, height: 420 },
  minSize: { width: 400, height: 350 },

  container: null,
  storage: null,
  isTransitioning: false,

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this._buildUI();
  },

  _buildUI() {
    const isActive = Storage.get('storymode', 'active', false);
    const character = Storage.get('storymode', 'character', null);

    this.container.innerHTML = `
      <div class="storymode-app">
        ${isActive ? this._activeUI(character) : this._launcherUI()}
      </div>
    `;

    this._bindEvents();
  },

  _launcherUI() {
    return `
      <div class="storymode-launcher">
        <div class="storymode-icon">
          <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="40" cy="30" r="18" opacity="0.3"/>
            <circle cx="40" cy="30" r="12" opacity="0.5"/>
            <circle cx="40" cy="30" r="6" opacity="0.8"/>
            <path d="M20 55 Q40 45 60 55" opacity="0.2" stroke-width="8"/>
            <path d="M25 58 Q40 50 55 58" opacity="0.15" stroke-width="6"/>
          </svg>
        </div>
        <p class="storymode-tagline">Someone was here before you.</p>
        <p class="storymode-tagline-sub">Their traces remain.</p>
        <button class="storymode-enter-btn">Enter Story Mode</button>
        <p class="storymode-disclaimer">Your data will be saved and restored when you exit.</p>
      </div>
    `;
  },

  _activeUI(character) {
    const charInfo = character
      ? `<p class="storymode-active-char">You are exploring the remnants of <strong>${this._escapeHtml(character.name)}</strong>.</p>
         <p class="storymode-active-hint">Open Notes, Writing, and Synth to piece together their story.</p>`
      : `<p class="storymode-active-hint">Explore the desktop to find what was left behind.</p>`;

    return `
      <div class="storymode-active">
        <div class="storymode-active-icon">
          <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="20" cy="20" r="15" opacity="0.3"/>
            <circle cx="20" cy="20" r="8" opacity="0.6"/>
          </svg>
        </div>
        <p class="storymode-active-label">Story Mode Active</p>
        ${charInfo}
        <button class="storymode-exit-btn">Exit Story Mode</button>
        <p class="storymode-exit-note">Your original data will be restored.</p>
      </div>
    `;
  },

  _bindEvents() {
    const enterBtn = this.container.querySelector('.storymode-enter-btn');
    if (enterBtn) {
      enterBtn.addEventListener('click', () => this._enterStoryMode());
    }

    const exitBtn = this.container.querySelector('.storymode-exit-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => this._exitStoryMode());
    }
  },

  async _enterStoryMode() {
    if (this.isTransitioning) return;

    if (!confirm('Enter Story Mode?\n\nYour current data (notes, documents, patterns) will be safely backed up and restored when you exit.')) {
      return;
    }

    this.isTransitioning = true;

    // Update button state
    const btn = this.container.querySelector('.storymode-enter-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Entering...';
    }

    // Create fullscreen overlay
    const overlay = document.createElement('div');
    overlay.className = 'storymode-overlay';
    overlay.innerHTML = `
      <canvas class="storymode-static"></canvas>
      <div class="storymode-status-text"></div>
    `;
    document.body.appendChild(overlay);

    // Start static/glitch effect
    const canvas = overlay.querySelector('.storymode-static');
    const statusText = overlay.querySelector('.storymode-status-text');
    this._startStaticEffect(canvas);

    // Fade in
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
    });

    // Wait for fade
    await this._wait(800);

    // Backup user data
    statusText.textContent = 'Saving your data...';
    await this._wait(500);
    GhostEngine.backupUserData();

    // Generate narrative
    statusText.textContent = 'Reaching into the void...';
    let narrative;
    try {
      narrative = await GhostEngine.generateNarrative((status) => {
        statusText.textContent = status;
      });
    } catch (err) {
      console.error('Story Mode: generation failed', err);
      // Restore and abort
      statusText.textContent = 'Something went wrong...';
      await this._wait(1500);
      overlay.classList.remove('visible');
      await this._wait(600);
      overlay.remove();
      this.isTransitioning = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Enter Story Mode';
      }
      return;
    }

    // Populate ghost content
    statusText.textContent = 'Traces materializing...';
    await this._wait(600);
    GhostEngine.populateRemnants(narrative);

    // Close all open windows so modules reload with ghost data
    statusText.textContent = '';
    await this._wait(400);

    // Brief glitch intensification
    overlay.classList.add('glitch-intense');
    await this._wait(600);

    // Fade out and reload
    overlay.classList.remove('glitch-intense');
    overlay.classList.add('fading-out');
    await this._wait(400);

    // Reload to reinitialize all modules with ghost data
    window.location.reload();
  },

  async _exitStoryMode() {
    if (this.isTransitioning) return;

    if (!confirm('Exit Story Mode?\n\nYour original notes, documents, and patterns will be restored.')) {
      return;
    }

    this.isTransitioning = true;

    const btn = this.container.querySelector('.storymode-exit-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Exiting...';
    }

    // Create overlay for transition
    const overlay = document.createElement('div');
    overlay.className = 'storymode-overlay';
    overlay.innerHTML = `
      <canvas class="storymode-static"></canvas>
      <div class="storymode-status-text">Restoring your data...</div>
    `;
    document.body.appendChild(overlay);

    const canvas = overlay.querySelector('.storymode-static');
    this._startStaticEffect(canvas);

    requestAnimationFrame(() => {
      overlay.classList.add('visible');
    });

    await this._wait(800);

    // Restore user data
    GhostEngine.restoreUserData();

    await this._wait(600);

    // Reload to reinitialize with restored data
    window.location.reload();
  },

  /**
   * Draw TV static noise on canvas
   */
  _startStaticEffect(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animId;
    const draw = () => {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = Math.random() * 40 + 10; // Low opacity static
      }

      ctx.putImageData(imageData, 0, 0);
      animId = requestAnimationFrame(draw);
    };

    draw();

    // Store animId for cleanup (will be cleared on page reload anyway)
    canvas._animId = animId;
  },

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  render() {},

  destroy() {
    this.isTransitioning = false;
  }
};

export default StoryModeModule;
