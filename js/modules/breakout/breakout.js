/**
 * Breakout Module - Classic brick breaker game
 */
const BreakoutModule = {
  id: 'breakout',
  title: 'Breakout',
  icon: '🧱',
  defaultSize: { width: 480, height: 400 },
  minSize: { width: 400, height: 350 },

  container: null,
  storage: null,
  canvas: null,
  ctx: null,
  animationId: null,
  gameState: 'idle', // idle, playing, paused, won, lost

  // Game objects
  ball: null,
  paddle: null,
  bricks: [],

  // Game settings
  brickRowCount: 5,
  brickColumnCount: 8,
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
      <div class="breakout-container">
        <div class="breakout-header">
          <div class="breakout-score">Score: <span data-score>0</span></div>
          <div class="breakout-high">Best: <span data-high>${this.highScore}</span></div>
        </div>
        <canvas class="breakout-canvas"></canvas>
        <div class="breakout-controls">
          <button class="breakout-btn" data-action="start">Start Game</button>
          <span class="breakout-hint">← → or A/D to move</span>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('.breakout-canvas');
    this.ctx = this.canvas.getContext('2d');
  },

  _setupEventListeners() {
    this.keys = { left: false, right: false };

    this._keyDownHandler = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = true;
      if (e.key === ' ' && this.gameState === 'idle') this._startGame();
    };

    this._keyUpHandler = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = false;
    };

    document.addEventListener('keydown', this._keyDownHandler);
    document.addEventListener('keyup', this._keyUpHandler);

    this.container.querySelector('[data-action="start"]').addEventListener('click', () => {
      if (this.gameState !== 'playing') this._startGame();
    });
  },

  render() {
    this._resizeCanvas();
    this._drawIdle();

    // Handle window resize
    this._resizeObserver = new ResizeObserver(() => {
      this._resizeCanvas();
      if (this.gameState === 'idle') this._drawIdle();
    });
    this._resizeObserver.observe(this.container);
  },

  _resizeCanvas() {
    const container = this.container.querySelector('.breakout-container');
    const header = this.container.querySelector('.breakout-header');
    const controls = this.container.querySelector('.breakout-controls');

    const width = container.clientWidth - 20;
    const height = container.clientHeight - header.offsetHeight - controls.offsetHeight - 30;

    this.canvas.width = Math.max(300, width);
    this.canvas.height = Math.max(200, height);
  },

  _initGame() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Paddle
    this.paddle = {
      width: 80,
      height: 12,
      x: w / 2 - 40,
      y: h - 25,
      speed: 7
    };

    // Ball
    this.ball = {
      x: w / 2,
      y: h - 40,
      radius: 8,
      dx: 4,
      dy: -4
    };

    // Bricks
    this.bricks = [];
    const brickWidth = (w - 40) / this.brickColumnCount - 4;
    const brickHeight = 18;
    const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db'];

    for (let row = 0; row < this.brickRowCount; row++) {
      for (let col = 0; col < this.brickColumnCount; col++) {
        this.bricks.push({
          x: 20 + col * (brickWidth + 4),
          y: 20 + row * (brickHeight + 4),
          width: brickWidth,
          height: brickHeight,
          color: colors[row % colors.length],
          alive: true
        });
      }
    }

    this.score = 0;
    this._updateScore();
  },

  _startGame() {
    this._initGame();
    this.gameState = 'playing';
    this.container.querySelector('[data-action="start"]').textContent = 'Restart';
    this._gameLoop();
  },

  _gameLoop() {
    if (this.gameState !== 'playing') return;

    this._update();
    this._draw();
    this.animationId = requestAnimationFrame(() => this._gameLoop());
  },

  _update() {
    // Move paddle
    if (this.keys.left && this.paddle.x > 0) {
      this.paddle.x -= this.paddle.speed;
    }
    if (this.keys.right && this.paddle.x < this.canvas.width - this.paddle.width) {
      this.paddle.x += this.paddle.speed;
    }

    // Move ball
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // Wall collisions
    if (this.ball.x - this.ball.radius < 0 || this.ball.x + this.ball.radius > this.canvas.width) {
      this.ball.dx = -this.ball.dx;
    }
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.dy = -this.ball.dy;
    }

    // Paddle collision
    if (this.ball.y + this.ball.radius > this.paddle.y &&
        this.ball.x > this.paddle.x &&
        this.ball.x < this.paddle.x + this.paddle.width) {
      this.ball.dy = -Math.abs(this.ball.dy);
      // Add angle based on where ball hits paddle
      const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
      this.ball.dx = 6 * (hitPos - 0.5);
    }

    // Brick collisions
    for (const brick of this.bricks) {
      if (!brick.alive) continue;

      if (this.ball.x > brick.x &&
          this.ball.x < brick.x + brick.width &&
          this.ball.y - this.ball.radius < brick.y + brick.height &&
          this.ball.y + this.ball.radius > brick.y) {
        brick.alive = false;
        this.ball.dy = -this.ball.dy;
        this.score += 10;
        this._updateScore();
      }
    }

    // Check win
    if (this.bricks.every(b => !b.alive)) {
      this._endGame(true);
    }

    // Check lose
    if (this.ball.y > this.canvas.height) {
      this._endGame(false);
    }
  },

  _draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Draw bricks
    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    }

    // Draw paddle
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);

    // Draw ball
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.closePath();
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

  _endGame(won) {
    this.gameState = won ? 'won' : 'lost';
    cancelAnimationFrame(this.animationId);

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
    ctx.fillText(won ? 'You Win!' : 'Game Over', w / 2, h / 2 - 10);
    ctx.font = '16px sans-serif';
    ctx.fillText(`Score: ${this.score}`, w / 2, h / 2 + 20);

    this.container.querySelector('[data-action="start"]').textContent = 'Play Again';
    this.gameState = 'idle';
  },

  _updateScore() {
    this.container.querySelector('[data-score]').textContent = this.score;
  },

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    document.removeEventListener('keydown', this._keyDownHandler);
    document.removeEventListener('keyup', this._keyUpHandler);
  }
};

export default BreakoutModule;
