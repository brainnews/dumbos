/**
 * Screensaver Engine - Idle-activated visual screensavers
 * Supports multiple screensaver types: starfield, matrix, bouncing logo
 */
import Storage from './storage.js';

class Screensaver {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.overlay = null;
    this.animationId = null;
    this.isActive = false;
    this.lastActivity = Date.now();
    this.checkInterval = null;

    // Animation state
    this.stars = [];
    this.matrixColumns = [];
    this.logo = { x: 0, y: 0, vx: 2, vy: 2, hue: 0 };
  }

  /**
   * Initialize the screensaver system
   */
  init() {
    this._createOverlay();
    this._attachActivityListeners();
    this._startIdleCheck();
  }

  /**
   * Create the fullscreen canvas overlay
   */
  _createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'screensaver-overlay';
    this.overlay.style.display = 'none';

    this.canvas = document.createElement('canvas');
    this.overlay.appendChild(this.canvas);

    document.body.appendChild(this.overlay);

    this.ctx = this.canvas.getContext('2d');

    // Dismiss on any interaction
    ['click', 'mousemove', 'keydown', 'touchstart'].forEach(event => {
      this.overlay.addEventListener(event, () => this._dismiss(), { once: false });
    });

    // Handle resize
    window.addEventListener('resize', () => {
      if (this.isActive) {
        this._resizeCanvas();
      }
    });
  }

  /**
   * Attach activity listeners to track user interaction
   */
  _attachActivityListeners() {
    const resetActivity = () => {
      this.lastActivity = Date.now();
    };

    ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'].forEach(event => {
      document.addEventListener(event, resetActivity, { passive: true });
    });
  }

  /**
   * Start checking for idle state
   */
  _startIdleCheck() {
    this.checkInterval = setInterval(() => {
      const enabled = Storage.get('screensaver', 'enabled', false);
      if (!enabled || this.isActive) return;

      const idleMinutes = Storage.get('screensaver', 'idleMinutes', 5);
      const idleMs = idleMinutes * 60 * 1000;
      const elapsed = Date.now() - this.lastActivity;

      if (elapsed >= idleMs) {
        this._activate();
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Activate the screensaver
   */
  _activate() {
    if (this.isActive) return;

    this.isActive = true;
    this.overlay.style.display = 'flex';
    this._resizeCanvas();

    const type = Storage.get('screensaver', 'type', 'starfield');
    this._initAnimation(type);
    this._runAnimation(type);
  }

  /**
   * Dismiss the screensaver
   */
  _dismiss() {
    if (!this.isActive) return;

    this.isActive = false;
    this.overlay.style.display = 'none';
    this.lastActivity = Date.now();

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Resize canvas to fill screen
   */
  _resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Initialize animation state based on type
   */
  _initAnimation(type) {
    switch (type) {
      case 'starfield':
        this._initStarfield();
        break;
      case 'matrix':
        this._initMatrix();
        break;
      case 'bouncing':
        this._initBouncing();
        break;
    }
  }

  /**
   * Run the animation loop
   */
  _runAnimation(type) {
    const animate = () => {
      if (!this.isActive) return;

      switch (type) {
        case 'starfield':
          this._drawStarfield();
          break;
        case 'matrix':
          this._drawMatrix();
          break;
        case 'bouncing':
          this._drawBouncing();
          break;
      }

      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  // ===== STARFIELD =====

  _initStarfield() {
    this.stars = [];
    const numStars = 300;

    for (let i = 0; i < numStars; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width - this.canvas.width / 2,
        y: Math.random() * this.canvas.height - this.canvas.height / 2,
        z: Math.random() * 1000
      });
    }
  }

  _drawStarfield() {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.stars.forEach(star => {
      star.z -= 10;

      if (star.z <= 0) {
        star.x = Math.random() * canvas.width - cx;
        star.y = Math.random() * canvas.height - cy;
        star.z = 1000;
      }

      const sx = (star.x / star.z) * 400 + cx;
      const sy = (star.y / star.z) * 400 + cy;
      const size = (1 - star.z / 1000) * 3;
      const brightness = 1 - star.z / 1000;

      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.fill();
    });
  }

  // ===== MATRIX =====

  _initMatrix() {
    const fontSize = 16;
    const columns = Math.floor(this.canvas.width / fontSize);
    this.matrixColumns = [];
    this.matrixFontSize = fontSize;

    for (let i = 0; i < columns; i++) {
      this.matrixColumns.push({
        y: Math.random() * this.canvas.height,
        speed: 0.5 + Math.random() * 1.5
      });
    }

    // Fill with black initially
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _drawMatrix() {
    const { ctx, canvas } = this;
    const fontSize = this.matrixFontSize;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*(){}[]|;:,.<>?';

    // Fade effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSize}px monospace`;

    this.matrixColumns.forEach((col, i) => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;

      // Bright leading character
      ctx.fillStyle = '#fff';
      ctx.fillText(char, x, col.y);

      // Trail
      ctx.fillStyle = '#0f0';
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, col.y - fontSize);

      col.y += fontSize * col.speed;

      // Reset when reaching bottom (with some randomness)
      if (col.y > canvas.height && Math.random() > 0.975) {
        col.y = 0;
        col.speed = 0.5 + Math.random() * 1.5;
      }
    });
  }

  // ===== BOUNCING LOGO =====

  _initBouncing() {
    this.logo = {
      x: Math.random() * (this.canvas.width - 200),
      y: Math.random() * (this.canvas.height - 100),
      vx: 3 * (Math.random() > 0.5 ? 1 : -1),
      vy: 2 * (Math.random() > 0.5 ? 1 : -1),
      hue: Math.random() * 360
    };

    // Fill with black initially
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _drawBouncing() {
    const { ctx, canvas, logo } = this;
    const logoWidth = 180;
    const logoHeight = 60;

    // Slight fade for trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update position
    logo.x += logo.vx;
    logo.y += logo.vy;

    // Bounce off walls and change color
    if (logo.x <= 0 || logo.x + logoWidth >= canvas.width) {
      logo.vx *= -1;
      logo.hue = (logo.hue + 60) % 360;
    }
    if (logo.y <= 0 || logo.y + logoHeight >= canvas.height) {
      logo.vy *= -1;
      logo.hue = (logo.hue + 60) % 360;
    }

    // Draw logo
    ctx.save();
    ctx.translate(logo.x, logo.y);

    // Background box
    ctx.fillStyle = `hsl(${logo.hue}, 70%, 50%)`;
    ctx.beginPath();
    ctx.roundRect(0, 0, logoWidth, logoHeight, 8);
    ctx.fill();

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DumbOS', logoWidth / 2, logoHeight / 2);

    ctx.restore();
  }

  /**
   * Preview a screensaver type
   */
  preview(type) {
    this.lastActivity = Date.now();
    this.isActive = true;
    this.overlay.style.display = 'flex';
    this._resizeCanvas();
    this._initAnimation(type);
    this._runAnimation(type);
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.overlay) {
      this.overlay.remove();
    }
  }
}

// Singleton instance
const screensaver = new Screensaver();

export default screensaver;
