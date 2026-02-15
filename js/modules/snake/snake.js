/**
 * Snake Module - Classic snake game
 */
const SnakeModule = {
  id: 'snake',
  title: 'Snake',
  category: 'games',
  description: 'Classic snake game',
  icon: '🐍',
  defaultSize: { width: 400, height: 420 },
  minSize: { width: 320, height: 360 },

  container: null,
  storage: null,
  canvas: null,
  ctx: null,
  gameInterval: null,
  gameState: 'idle', // idle, playing, paused, lost

  // Game objects
  snake: [],
  food: null,
  direction: 'right',
  nextDirection: 'right',

  // Game settings
  gridSize: 20,
  speed: 120, // ms per tick
  score: 0,
  highScore: 0,

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this.highScore = storage.get('highScore', 0);
    this._buildUI();
    this._setupEventListeners();
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="snake-container">
        <div class="snake-header">
          <div class="snake-score">Score: <span data-score>0</span></div>
          <div class="snake-high">Best: <span data-high>${this.highScore}</span></div>
        </div>
        <canvas class="snake-canvas"></canvas>
        <div class="snake-controls">
          <button class="snake-btn" data-action="start">Start Game</button>
          <span class="snake-hint">← ↑ ↓ → or WASD to move</span>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('.snake-canvas');
    this.ctx = this.canvas.getContext('2d');
  },

  _setupEventListeners() {
    this._keyHandler = (e) => {
      if (this.gameState !== 'playing') {
        if (e.key === ' ') this._startGame();
        return;
      }

      const keyMap = {
        'ArrowUp': 'up', 'w': 'up', 'W': 'up',
        'ArrowDown': 'down', 's': 'down', 'S': 'down',
        'ArrowLeft': 'left', 'a': 'left', 'A': 'left',
        'ArrowRight': 'right', 'd': 'right', 'D': 'right'
      };

      const newDir = keyMap[e.key];
      if (!newDir) return;

      // Prevent 180-degree turns
      const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
      if (opposites[newDir] !== this.direction) {
        this.nextDirection = newDir;
      }
    };

    document.addEventListener('keydown', this._keyHandler);

    this.container.querySelector('[data-action="start"]').addEventListener('click', () => {
      if (this.gameState !== 'playing') this._startGame();
    });

    // Touch swipe controls
    if ('ontouchstart' in window) {
      let touchStartX = 0;
      let touchStartY = 0;
      this.container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      this.container.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (Math.max(absDx, absDy) < 20) return;

        let newDir;
        if (absDx > absDy) {
          newDir = dx > 0 ? 'right' : 'left';
        } else {
          newDir = dy > 0 ? 'down' : 'up';
        }

        if (this.gameState === 'playing') {
          const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
          if (opposites[newDir] !== this.direction) {
            this.nextDirection = newDir;
          }
        }
      }, { passive: true });

      // Update hint text for touch
      const hint = this.container.querySelector('.snake-hint');
      if (hint) hint.textContent = 'Swipe to move';
    }
  },

  render() {
    this._resizeCanvas();
    this._drawIdle();

    this._resizeObserver = new ResizeObserver(() => {
      this._resizeCanvas();
      if (this.gameState === 'idle') this._drawIdle();
    });
    this._resizeObserver.observe(this.container);
  },

  _resizeCanvas() {
    const container = this.container.querySelector('.snake-container');
    const header = this.container.querySelector('.snake-header');
    const controls = this.container.querySelector('.snake-controls');

    const availableWidth = container.clientWidth - 20;
    const availableHeight = container.clientHeight - header.offsetHeight - controls.offsetHeight - 30;

    // Make canvas a multiple of grid size
    const cols = Math.floor(availableWidth / this.gridSize);
    const rows = Math.floor(availableHeight / this.gridSize);

    this.canvas.width = cols * this.gridSize;
    this.canvas.height = rows * this.gridSize;
    this.cols = cols;
    this.rows = rows;
  },

  _initGame() {
    // Start snake in middle
    const startX = Math.floor(this.cols / 2);
    const startY = Math.floor(this.rows / 2);

    this.snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY }
    ];

    this.direction = 'right';
    this.nextDirection = 'right';
    this.score = 0;
    this._updateScore();
    this._spawnFood();
  },

  _spawnFood() {
    let x, y;
    do {
      x = Math.floor(Math.random() * this.cols);
      y = Math.floor(Math.random() * this.rows);
    } while (this.snake.some(s => s.x === x && s.y === y));

    this.food = { x, y };
  },

  _startGame() {
    this._resizeCanvas();
    this._initGame();
    this.gameState = 'playing';
    this.container.querySelector('[data-action="start"]').textContent = 'Restart';

    if (this.gameInterval) clearInterval(this.gameInterval);
    this.gameInterval = setInterval(() => this._tick(), this.speed);
  },

  _tick() {
    if (this.gameState !== 'playing') return;

    this.direction = this.nextDirection;

    // Calculate new head position
    const head = { ...this.snake[0] };
    switch (this.direction) {
      case 'up': head.y--; break;
      case 'down': head.y++; break;
      case 'left': head.x--; break;
      case 'right': head.x++; break;
    }

    // Check wall collision
    if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
      this._endGame();
      return;
    }

    // Check self collision
    if (this.snake.some(s => s.x === head.x && s.y === head.y)) {
      this._endGame();
      return;
    }

    // Move snake
    this.snake.unshift(head);

    // Check food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this._updateScore();
      this._spawnFood();
    } else {
      this.snake.pop();
    }

    this._draw();
  },

  _draw() {
    const ctx = this.ctx;
    const g = this.gridSize;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Draw grid (subtle)
    ctx.strokeStyle = '#252542';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += g) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += g) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw food
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(
      this.food.x * g + g / 2,
      this.food.y * g + g / 2,
      g / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw snake
    this.snake.forEach((segment, i) => {
      const isHead = i === 0;
      ctx.fillStyle = isHead ? '#2ecc71' : '#27ae60';
      ctx.fillRect(
        segment.x * g + 1,
        segment.y * g + 1,
        g - 2,
        g - 2
      );
    });
  },

  _drawIdle() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ecf0f1';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press Start or Space', w / 2, h / 2);
  },

  _endGame() {
    this.gameState = 'lost';
    clearInterval(this.gameInterval);

    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.storage.set('highScore', this.highScore);
      this.container.querySelector('[data-high]').textContent = this.highScore;
    }

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', w / 2, h / 2 - 10);
    ctx.font = '16px sans-serif';
    ctx.fillText(`Score: ${this.score}`, w / 2, h / 2 + 20);

    this.container.querySelector('[data-action="start"]').textContent = 'Play Again';
    this.gameState = 'idle';
  },

  _updateScore() {
    this.container.querySelector('[data-score]').textContent = this.score;
  },

  destroy() {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    document.removeEventListener('keydown', this._keyHandler);
  }
};

export default SnakeModule;
