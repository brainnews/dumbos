/**
 * Bubble Wrap Module - Pop bubbles, reset when done
 */
const BubbleWrapModule = {
  id: 'bubblewrap',
  title: 'Bubble Wrap',
  category: 'games',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><circle cx="12" cy="12" r="3"/></svg>`,
  defaultSize: { width: 360, height: 400 },
  minSize: { width: 280, height: 300 },

  container: null,
  storage: null,
  cols: 8,
  rows: 8,
  popped: null,

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this.popped = new Set(storage.get('popped', []));
    this._buildUI();
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="bubblewrap-container">
        <div class="bubblewrap-header">
          <span class="bubblewrap-counter"></span>
          <button class="bubblewrap-reset">New Sheet</button>
        </div>
        <div class="bubblewrap-grid"></div>
      </div>
    `;

    this.container.querySelector('.bubblewrap-reset').addEventListener('click', () => this._reset());
    this._renderGrid();
    this._updateCounter();
  },

  _renderGrid() {
    const grid = this.container.querySelector('.bubblewrap-grid');
    const total = this.cols * this.rows;
    grid.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;

    grid.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'bubblewrap-bubble' + (this.popped.has(i) ? ' popped' : '');
      bubble.dataset.index = i;
      bubble.addEventListener('click', () => this._pop(i, bubble));
      grid.appendChild(bubble);
    }
  },

  _pop(index, el) {
    if (this.popped.has(index)) return;

    this.popped.add(index);
    el.classList.add('popped');
    this._updateCounter();
    this.storage.set('popped', [...this.popped]);

    // Auto-reset when all popped
    const total = this.cols * this.rows;
    if (this.popped.size >= total) {
      setTimeout(() => this._reset(), 800);
    }
  },

  _reset() {
    this.popped = new Set();
    this.storage.set('popped', []);
    this._renderGrid();
    this._updateCounter();
  },

  _updateCounter() {
    const total = this.cols * this.rows;
    const remaining = total - this.popped.size;
    this.container.querySelector('.bubblewrap-counter').textContent = `${remaining} / ${total} remaining`;
  },

  render() {},
  destroy() {}
};

export default BubbleWrapModule;
