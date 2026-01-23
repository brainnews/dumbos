/**
 * Pixel Art Module - Simple grid-based drawing canvas
 */
const PixelArtModule = {
  id: 'pixelart',
  title: 'Pixel Art',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  defaultSize: { width: 460, height: 500 },
  minSize: { width: 350, height: 380 },

  container: null,
  storage: null,
  gridSize: 16,
  currentColor: '#ffffff',
  isErasing: false,
  isDrawing: false,
  pixels: null,

  palette: [
    '#ffffff', '#c0c0c0', '#808080', '#404040',
    '#ff6b6b', '#ee5a24', '#f6b93b', '#fad390',
    '#78e08f', '#38ada9', '#60a3bc', '#4a69bd',
    '#6c5ce7', '#a55eea', '#fd79a8', '#e77f67'
  ],

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this.pixels = storage.get('pixels', {});
    this._buildUI();
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="pixelart-container">
        <div class="pixelart-toolbar">
          <div class="pixelart-palette"></div>
          <div class="pixelart-tools">
            <button class="pixelart-tool-btn" data-tool="eraser">Eraser</button>
            <button class="pixelart-tool-btn" data-tool="clear">Clear</button>
          </div>
        </div>
        <div class="pixelart-canvas-wrapper">
          <div class="pixelart-grid"></div>
        </div>
      </div>
    `;

    this._renderPalette();
    this._renderGrid();

    this.container.querySelector('[data-tool="eraser"]').addEventListener('click', (e) => {
      this.isErasing = !this.isErasing;
      e.target.classList.toggle('active', this.isErasing);
    });

    this.container.querySelector('[data-tool="clear"]').addEventListener('click', () => {
      this.pixels = {};
      this.storage.set('pixels', {});
      this._renderGrid();
    });

    // Mouse up anywhere stops drawing
    this._onMouseUp = () => { this.isDrawing = false; };
    document.addEventListener('mouseup', this._onMouseUp);
  },

  _renderPalette() {
    const palette = this.container.querySelector('.pixelart-palette');
    palette.innerHTML = this.palette.map(color => `
      <div class="pixelart-swatch ${color === this.currentColor ? 'active' : ''}"
           data-color="${color}"
           style="background: ${color}"></div>
    `).join('');

    palette.addEventListener('click', (e) => {
      const swatch = e.target.closest('.pixelart-swatch');
      if (!swatch) return;

      this.currentColor = swatch.dataset.color;
      this.isErasing = false;
      this.container.querySelector('[data-tool="eraser"]').classList.remove('active');
      palette.querySelectorAll('.pixelart-swatch').forEach(s => {
        s.classList.toggle('active', s.dataset.color === this.currentColor);
      });
    });
  },

  _renderGrid() {
    const grid = this.container.querySelector('.pixelart-grid');
    const cellSize = Math.floor(Math.min(
      (this.container.querySelector('.pixelart-canvas-wrapper').clientWidth - 20) / this.gridSize,
      (this.container.querySelector('.pixelart-canvas-wrapper').clientHeight - 20) / this.gridSize
    ));

    grid.style.gridTemplateColumns = `repeat(${this.gridSize}, ${cellSize}px)`;
    grid.style.gridTemplateRows = `repeat(${this.gridSize}, ${cellSize}px)`;

    grid.innerHTML = '';
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const key = `${row},${col}`;
        const cell = document.createElement('div');
        cell.className = 'pixelart-cell';
        cell.dataset.key = key;
        if (this.pixels[key]) {
          cell.style.background = this.pixels[key];
        }

        cell.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.isDrawing = true;
          this._paint(cell, key);
        });

        cell.addEventListener('mouseenter', () => {
          if (this.isDrawing) this._paint(cell, key);
        });

        grid.appendChild(cell);
      }
    }
  },

  _paint(cell, key) {
    if (this.isErasing) {
      cell.style.background = 'var(--bg-primary)';
      delete this.pixels[key];
    } else {
      cell.style.background = this.currentColor;
      this.pixels[key] = this.currentColor;
    }
    this._saveDebounced();
  },

  _saveDebounced() {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      this.storage.set('pixels', this.pixels);
    }, 500);
  },

  render() {},

  destroy() {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    document.removeEventListener('mouseup', this._onMouseUp);
  }
};

export default PixelArtModule;
