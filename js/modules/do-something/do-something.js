/**
 * Do Something — A hypnotic stream of micro-tasks
 */
import games from './games.js';

const DoSomethingModule = {
  id: 'do-something',
  title: 'Do Something',
  category: 'games',
  description: 'An endless stream of pointless micro-tasks',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>`,
  defaultSize: { width: 400, height: 500 },
  minSize: { width: 320, height: 400 },

  container: null,
  storage: null,
  sessionStart: null,
  tasksCompleted: 0,
  currentGame: null,
  gameHistory: [],
  isPlaying: false,
  _promptTimeout: null,

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this.sessionStart = null;
    this.tasksCompleted = 0;
    this.currentGame = null;
    this.gameHistory = [];
    this.isPlaying = false;
    this._promptTimeout = null;
    this._buildStartScreen();
  },

  render() {},

  destroy() {
    if (this.currentGame) {
      this.currentGame.teardown();
      this.currentGame = null;
    }
    clearTimeout(this._promptTimeout);
    this.isPlaying = false;
  },

  _buildStartScreen() {
    this.container.innerHTML = `
      <div class="ds-container">
        <div class="ds-start-screen">
          <div class="ds-start-icon">📱</div>
          <h2 class="ds-start-title">Do Something</h2>
          <p class="ds-start-sub">An endless stream of very important tasks.</p>
          <button class="ds-start-btn">Do Something</button>
        </div>
      </div>
    `;
    this.container.querySelector('.ds-start-btn').addEventListener('click', () => this._startSession());
  },

  _startSession() {
    this.sessionStart = Date.now();
    this.tasksCompleted = 0;
    this.gameHistory = [];
    this.isPlaying = true;
    this._loadNextGame();
  },

  _showPrompt(text, callback) {
    this.container.innerHTML = `
      <div class="ds-container">
        <div class="ds-prompt">
          <div class="ds-prompt-text">${text}</div>
        </div>
        <button class="ds-stop-btn">stop</button>
      </div>
    `;
    this.container.querySelector('.ds-stop-btn').addEventListener('click', () => this._showReport());

    this._promptTimeout = setTimeout(() => {
      if (this.isPlaying) callback();
    }, 1400);
  },

  _loadNextGame() {
    if (!this.isPlaying) return;

    // Pick a random game, avoid last 8 played
    const recent = this.gameHistory.slice(-8);
    const available = games.filter(g => !recent.includes(g.id));
    const pick = available[Math.floor(Math.random() * available.length)];

    this._showPrompt(pick.prompt, () => {
      this.currentGame = pick;
      this.gameHistory.push(pick.id);

      this.container.innerHTML = `
        <div class="ds-container">
          <div class="ds-game-area"></div>
          <button class="ds-stop-btn">stop</button>
        </div>
      `;
      this.container.querySelector('.ds-stop-btn').addEventListener('click', () => this._showReport());

      const gameArea = this.container.querySelector('.ds-game-area');
      pick.setup(gameArea, () => this._onGameComplete());
    });
  },

  _onGameComplete() {
    if (!this.isPlaying) return;
    this.tasksCompleted++;
    if (this.currentGame) {
      this.currentGame.teardown();
      this.currentGame = null;
    }

    // Brief pause then next game
    this._promptTimeout = setTimeout(() => {
      if (this.isPlaying) this._loadNextGame();
    }, 600);
  },

  _showReport() {
    this.isPlaying = false;
    if (this.currentGame) {
      this.currentGame.teardown();
      this.currentGame = null;
    }
    clearTimeout(this._promptTimeout);

    const elapsed = Date.now() - this.sessionStart;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const quips = [
      'Time well spent.',
      'You could have learned a language.',
      'Productivity at its finest.',
      'The internet thanks you for your service.',
      'Your screen misses you already.',
      'Achievement unlocked: nothing.',
      'That was definitely worth it.',
      'You did something. Congratulations.',
    ];
    const quip = quips[Math.floor(Math.random() * quips.length)];

    this.container.innerHTML = `
      <div class="ds-container">
        <div class="ds-report">
          <div class="ds-report-header">
            <div class="ds-report-icon">📊</div>
            <div class="ds-report-title">Screen Time Report</div>
          </div>
          <div class="ds-report-stats">
            <div class="ds-report-stat">
              <div class="ds-report-stat-value">${timeStr}</div>
              <div class="ds-report-stat-label">Time Spent</div>
            </div>
            <div class="ds-report-stat">
              <div class="ds-report-stat-value">${this.tasksCompleted}</div>
              <div class="ds-report-stat-label">Tasks Completed</div>
            </div>
            <div class="ds-report-stat">
              <div class="ds-report-stat-value">0</div>
              <div class="ds-report-stat-label">Productivity Score</div>
            </div>
          </div>
          <div class="ds-report-quip">${quip}</div>
          <button class="ds-start-btn">Do Something Again</button>
        </div>
      </div>
    `;
    this.container.querySelector('.ds-start-btn').addEventListener('click', () => this._startSession());
  }
};

export default DoSomethingModule;
