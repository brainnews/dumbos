/**
 * Nonogram Module - Grid puzzle (Picross)
 */
const NonogramModule = {
  id: 'nonogram',
  title: 'Nonogram',
  category: 'games',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><rect x="7" y="7" width="4" height="4" fill="currentColor"/><rect x="13" y="7" width="4" height="4" fill="currentColor"/><rect x="7" y="13" width="4" height="4" fill="currentColor"/></svg>`,
  defaultSize: { width: 400, height: 450 },
  minSize: { width: 320, height: 360 },

  container: null,
  storage: null,
  size: 5,
  solution: null,
  grid: null,
  solved: false,

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this.size = storage.get('size', 5);

    // Load saved puzzle or generate new one
    const saved = storage.get('puzzle', null);
    if (saved && saved.solution && saved.solution.length === this.size) {
      this.solution = saved.solution;
      this.grid = saved.grid;
      this.solved = saved.solved || false;
    } else {
      this._generatePuzzle();
    }

    this._buildUI();
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="nonogram-container">
        <div class="nonogram-header">
          <span class="nonogram-status"></span>
          <div class="nonogram-controls">
            <select class="nonogram-size-select">
              <option value="5" ${this.size === 5 ? 'selected' : ''}>5x5</option>
              <option value="10" ${this.size === 10 ? 'selected' : ''}>10x10</option>
            </select>
            <button class="nonogram-btn" data-action="new">New</button>
            <button class="nonogram-btn" data-action="clear">Clear</button>
          </div>
        </div>
        <div class="nonogram-board"></div>
        <div class="nonogram-help">
          <p>Fill cells to match the clue numbers. Each number represents a consecutive group of filled cells in that row or column. Groups are separated by at least one empty cell.</p>
          <p>Click to fill. Right-click to mark empty.</p>
        </div>
      </div>
    `;

    this.container.querySelector('[data-action="new"]').addEventListener('click', () => {
      this._generatePuzzle();
      this._renderBoard();
      this._updateStatus();
    });

    this.container.querySelector('[data-action="clear"]').addEventListener('click', () => {
      this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
      this.solved = false;
      this._renderBoard();
      this._updateStatus();
      this._save();
    });

    this.container.querySelector('.nonogram-size-select').addEventListener('change', (e) => {
      this.size = parseInt(e.target.value);
      this.storage.set('size', this.size);
      this._generatePuzzle();
      this._renderBoard();
      this._updateStatus();
    });

    this._renderBoard();
    this._updateStatus();
  },

  _generatePuzzle() {
    // Generate a random solution with ~40-60% fill rate
    this.solution = Array.from({ length: this.size }, () =>
      Array.from({ length: this.size }, () => Math.random() < 0.5 ? 1 : 0)
    );
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    this.solved = false;
    this._save();
  },

  _getClues(line) {
    const clues = [];
    let count = 0;
    for (const cell of line) {
      if (cell === 1) {
        count++;
      } else if (count > 0) {
        clues.push(count);
        count = 0;
      }
    }
    if (count > 0) clues.push(count);
    return clues.length ? clues : [0];
  },

  _getRowClues(row) {
    return this._getClues(this.solution[row]);
  },

  _getColClues(col) {
    const line = this.solution.map(row => row[col]);
    return this._getClues(line);
  },

  _renderBoard() {
    const board = this.container.querySelector('.nonogram-board');

    // Calculate max clue lengths for sizing
    const rowClues = Array.from({ length: this.size }, (_, i) => this._getRowClues(i));
    const colClues = Array.from({ length: this.size }, (_, i) => this._getColClues(i));

    let html = '<table class="nonogram-table">';

    // Column clues header
    const maxColClues = Math.max(...colClues.map(c => c.length));
    for (let ci = 0; ci < maxColClues; ci++) {
      html += '<tr>';
      if (ci === 0) {
        html += `<th class="nonogram-corner" rowspan="${maxColClues}"></th>`;
      }
      for (let col = 0; col < this.size; col++) {
        const clue = colClues[col];
        const offset = maxColClues - clue.length;
        const val = ci >= offset ? clue[ci - offset] : '';
        html += `<th class="nonogram-col-clues">${val}</th>`;
      }
      html += '</tr>';
    }

    // Rows
    for (let row = 0; row < this.size; row++) {
      html += '<tr>';
      html += `<th class="nonogram-row-clues"><div class="nonogram-clue-group">${rowClues[row].map(c => `<span>${c}</span>`).join('')}</div></th>`;
      for (let col = 0; col < this.size; col++) {
        const state = this.grid[row][col];
        let cls = 'nonogram-cell';
        if (state === 1) cls += ' filled';
        if (state === 2) cls += ' marked';
        html += `<td class="${cls}" data-row="${row}" data-col="${col}"></td>`;
      }
      html += '</tr>';
    }

    html += '</table>';
    board.innerHTML = html;

    // Cell click handlers
    board.querySelectorAll('.nonogram-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (this.solved) return;
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        // Cycle: empty -> filled -> empty
        this.grid[r][c] = this.grid[r][c] === 1 ? 0 : 1;
        this._renderBoard();
        this._checkSolved();
        this._save();
      });

      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (this.solved) return;
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        // Cycle: empty -> marked -> empty
        this.grid[r][c] = this.grid[r][c] === 2 ? 0 : 2;
        this._renderBoard();
        this._save();
      });
    });
  },

  _checkSolved() {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const filled = this.grid[row][col] === 1;
        const shouldBe = this.solution[row][col] === 1;
        if (filled !== shouldBe) return;
      }
    }
    this.solved = true;
    this._updateStatus();
    this._save();
  },

  _updateStatus() {
    const status = this.container.querySelector('.nonogram-status');
    if (this.solved) {
      status.textContent = 'Solved!';
      status.classList.add('solved');
    } else {
      status.textContent = `${this.size}×${this.size}`;
      status.classList.remove('solved');
    }
  },

  _save() {
    this.storage.set('puzzle', {
      solution: this.solution,
      grid: this.grid,
      solved: this.solved
    });
  },

  render() {},
  destroy() {}
};

export default NonogramModule;
