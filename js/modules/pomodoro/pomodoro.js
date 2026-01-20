/**
 * Pomodoro Timer Module - Focus timer with work/break intervals
 */
const PomodoroModule = {
  id: 'pomodoro',
  title: 'Pomodoro',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  defaultSize: { width: 300, height: 320 },
  minSize: { width: 250, height: 280 },

  container: null,
  storage: null,
  intervalId: null,
  timeLeft: 25 * 60,
  isRunning: false,
  mode: 'work', // 'work', 'shortBreak', 'longBreak'
  sessionsCompleted: 0,

  DURATIONS: {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60
  },

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this.sessionsCompleted = storage.get('sessions', 0);
    this._buildUI();
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="pomodoro-container">
        <div class="pomodoro-mode-tabs">
          <button class="pomodoro-tab active" data-mode="work">Work</button>
          <button class="pomodoro-tab" data-mode="shortBreak">Short</button>
          <button class="pomodoro-tab" data-mode="longBreak">Long</button>
        </div>
        <div class="pomodoro-display">
          <div class="pomodoro-time">25:00</div>
          <div class="pomodoro-label">Focus Time</div>
        </div>
        <div class="pomodoro-controls">
          <button class="pomodoro-btn pomodoro-btn-start">Start</button>
          <button class="pomodoro-btn pomodoro-btn-reset">Reset</button>
        </div>
        <div class="pomodoro-sessions">
          Sessions today: <span class="pomodoro-session-count">${this.sessionsCompleted}</span>
        </div>
      </div>
    `;

    this.timeDisplay = this.container.querySelector('.pomodoro-time');
    this.labelDisplay = this.container.querySelector('.pomodoro-label');
    this.startBtn = this.container.querySelector('.pomodoro-btn-start');
    this.sessionCount = this.container.querySelector('.pomodoro-session-count');

    // Tab listeners
    this.container.querySelectorAll('.pomodoro-tab').forEach(tab => {
      tab.addEventListener('click', () => this._setMode(tab.dataset.mode));
    });

    this.startBtn.addEventListener('click', () => this._toggleTimer());
    this.container.querySelector('.pomodoro-btn-reset').addEventListener('click', () => this._reset());
  },

  _setMode(mode) {
    if (this.isRunning) return;

    this.mode = mode;
    this.timeLeft = this.DURATIONS[mode];

    // Update tabs
    this.container.querySelectorAll('.pomodoro-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    // Update label
    const labels = { work: 'Focus Time', shortBreak: 'Short Break', longBreak: 'Long Break' };
    this.labelDisplay.textContent = labels[mode];

    this._updateDisplay();
  },

  _toggleTimer() {
    if (this.isRunning) {
      this._pause();
    } else {
      this._start();
    }
  },

  _start() {
    this.isRunning = true;
    this.startBtn.textContent = 'Pause';
    this.startBtn.classList.add('running');

    this.intervalId = setInterval(() => {
      this.timeLeft--;
      this._updateDisplay();

      if (this.timeLeft <= 0) {
        this._complete();
      }
    }, 1000);
  },

  _pause() {
    this.isRunning = false;
    this.startBtn.textContent = 'Resume';
    this.startBtn.classList.remove('running');
    clearInterval(this.intervalId);
  },

  _reset() {
    this.isRunning = false;
    this.startBtn.textContent = 'Start';
    this.startBtn.classList.remove('running');
    clearInterval(this.intervalId);
    this.timeLeft = this.DURATIONS[this.mode];
    this._updateDisplay();
  },

  _complete() {
    clearInterval(this.intervalId);
    this.isRunning = false;
    this.startBtn.textContent = 'Start';
    this.startBtn.classList.remove('running');

    // Play notification sound (optional beep)
    this._playSound();

    if (this.mode === 'work') {
      this.sessionsCompleted++;
      this.storage.set('sessions', this.sessionsCompleted);
      this.sessionCount.textContent = this.sessionsCompleted;

      // Auto switch to break
      if (this.sessionsCompleted % 4 === 0) {
        this._setMode('longBreak');
      } else {
        this._setMode('shortBreak');
      }
    } else {
      this._setMode('work');
    }

    // Show notification if permitted
    if (Notification.permission === 'granted') {
      new Notification('Pomodoro', {
        body: this.mode === 'work' ? 'Time to focus!' : 'Break complete!',
        icon: '/assets/icons/favicon.svg'
      });
    }
  },

  _playSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // Audio not supported
    }
  },

  _updateDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    this.timeDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  render() {
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  },

  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
};

export default PomodoroModule;
