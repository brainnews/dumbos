/**
 * Synth Module - Simple synthesizer with 16-step sequencer
 * Features melodic track (8 notes) and drum track (kick, snare, hi-hat)
 */
import Storage from '../../core/storage.js';

const AI_SYSTEM_PROMPT = `You are a music pattern generator for a 16-step sequencer. Generate patterns in JSON format.

SEQUENCER STRUCTURE:
- 16 steps total (0-15), where steps 0, 4, 8, 12 are downbeats (beats 1, 2, 3, 4)
- Melodic rows (8 notes, top to bottom): C5, B4, A4, G4, F4, E4, D4, C4
- Drum rows (3 sounds): kick, snare, hihat

MUSICAL CONVENTIONS:
- Kick drum typically on beats 1 and 3 (steps 0, 8)
- Snare typically on beats 2 and 4 (steps 4, 12)
- Hi-hat can be on every beat, every half-beat, or syncopated
- Melodies often follow scale patterns or simple phrases
- Leave some space - not every step needs a note

OUTPUT FORMAT (JSON only, no explanation):
{
  "melodicPattern": [[false,false,...], ...],  // 8 rows x 16 steps
  "drumPattern": [[false,false,...], ...]      // 3 rows x 16 steps
}

The melodicPattern array has 8 sub-arrays (one per note, C5 to C4).
The drumPattern array has 3 sub-arrays (kick, snare, hihat).
Each sub-array has 16 boolean values (true = note on, false = note off).`;

const SynthModule = {
  id: 'synth',
  title: 'Synth',
  category: 'entertainment',
  description: '16-step sequencer with synth and drums',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01"/><path d="M10 12h.01"/><path d="M14 12h.01"/><path d="M18 12h.01"/><path d="M6 16h.01"/><path d="M10 16h.01"/><path d="M14 16h.01"/><path d="M18 16h.01"/></svg>`,
  defaultSize: { width: 700, height: 440 },
  minSize: { width: 600, height: 380 },

  container: null,
  storage: null,
  audioContext: null,

  // Sequencer state
  isPlaying: false,
  currentStep: 0,
  intervalId: null,
  isAILoading: false,

  // Pattern state
  selectedPatternId: null,
  saveTimeout: null,
  SAVE_DELAY: 500,

  // Note frequencies (C4 to C5)
  notes: [
    { name: 'C5', freq: 523.25 },
    { name: 'B4', freq: 493.88 },
    { name: 'A4', freq: 440.00 },
    { name: 'G4', freq: 392.00 },
    { name: 'F4', freq: 349.23 },
    { name: 'E4', freq: 329.63 },
    { name: 'D4', freq: 293.66 },
    { name: 'C4', freq: 261.63 }
  ],

  drums: ['kick', 'snare', 'hihat'],

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this.selectedPatternId = null;
    this.saveTimeout = null;
    this._buildUI();
  },

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  _buildUI() {
    const tempo = this.storage.get('tempo', 120);
    const waveform = this.storage.get('waveform', 'sawtooth');
    const melodicPattern = this.storage.get('melodicPattern', this._emptyMelodicPattern());
    const drumPattern = this.storage.get('drumPattern', this._emptyDrumPattern());

    this.container.innerHTML = `
      <div class="synth-layout">
        <aside class="synth-sidebar">
          <div class="synth-sidebar-header">
            <span>Patterns</span>
            <button class="synth-add-btn" data-action="new-pattern" title="New Pattern">+</button>
          </div>
          <ul class="synth-patterns-list"></ul>
          <div class="synth-sidebar-footer">
            <button class="synth-btn synth-btn-sm" data-action="export">Export</button>
            <button class="synth-btn synth-btn-sm" data-action="import">Import</button>
            <input type="file" accept=".json" style="display:none" data-input="import-file">
          </div>
        </aside>
        <main class="synth-main">
          <div class="synth-empty">
            <p>Create a pattern to get started</p>
          </div>
          <div class="synth-editor" style="display:none">
            <div class="synth-pattern-header">
              <input type="text" class="synth-pattern-title" placeholder="Pattern name...">
              <span class="synth-pattern-status"></span>
            </div>
            <div class="synth-controls">
              <div class="synth-transport">
                <button class="synth-btn synth-btn-play" data-action="play">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><polygon points="5,3 19,12 5,21"/></svg>
                  Play
                </button>
                <button class="synth-btn synth-btn-stop" data-action="stop">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><rect x="5" y="5" width="14" height="14"/></svg>
                  Stop
                </button>
                <button class="synth-btn" data-action="clear">Clear</button>
                <div class="synth-ai-wrapper">
                  <button class="synth-btn synth-btn-ai" data-action="ai">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A1.5 1.5 0 0 0 6 14.5A1.5 1.5 0 0 0 7.5 16A1.5 1.5 0 0 0 9 14.5A1.5 1.5 0 0 0 7.5 13m9 0a1.5 1.5 0 0 0-1.5 1.5a1.5 1.5 0 0 0 1.5 1.5a1.5 1.5 0 0 0 1.5-1.5a1.5 1.5 0 0 0-1.5-1.5"/></svg>
                    AI
                  </button>
                  <div class="synth-ai-popover" style="display:none">
                    <div class="synth-ai-popover-content synth-ai-no-key" style="display:none">
                      <p>AI features require an API key.</p>
                      <button class="synth-btn synth-btn-sm" data-action="open-settings">Configure in Settings</button>
                    </div>
                    <div class="synth-ai-popover-content synth-ai-has-key" style="display:none">
                      <textarea class="synth-ai-prompt" placeholder="Describe a pattern... e.g. 'funky drum beat' or 'chill melody'" rows="2"></textarea>
                      <div class="synth-ai-actions">
                        <button class="synth-btn synth-btn-sm synth-btn-primary" data-action="ai-generate">Generate</button>
                        <button class="synth-btn synth-btn-sm" data-action="ai-vary">Vary</button>
                        <button class="synth-btn synth-btn-sm" data-action="ai-humanize">Humanize</button>
                      </div>
                      <div class="synth-ai-status"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="synth-settings">
                <label class="synth-label">
                  BPM
                  <input type="range" class="synth-slider" min="60" max="200" value="${tempo}" data-control="tempo">
                  <span class="synth-tempo-value">${tempo}</span>
                </label>
              </div>
            </div>

            <div class="synth-section">
              <div class="synth-section-header">
                <span class="synth-section-title">Synth</span>
                <select class="synth-select" data-control="waveform">
                  <option value="sine" ${waveform === 'sine' ? 'selected' : ''}>Sine</option>
                  <option value="square" ${waveform === 'square' ? 'selected' : ''}>Square</option>
                  <option value="sawtooth" ${waveform === 'sawtooth' ? 'selected' : ''}>Sawtooth</option>
                  <option value="triangle" ${waveform === 'triangle' ? 'selected' : ''}>Triangle</option>
                </select>
              </div>
              <div class="synth-grid synth-melodic-grid">
                ${this.notes.map((note, noteIdx) => `
                  <div class="synth-row">
                    <span class="synth-note-label">${note.name}</span>
                    ${Array(16).fill(0).map((_, step) => `
                      <button class="synth-cell ${melodicPattern[noteIdx][step] ? 'active' : ''}"
                              data-note="${noteIdx}" data-step="${step}"></button>
                    `).join('')}
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="synth-section">
              <div class="synth-section-header">
                <span class="synth-section-title">Drums</span>
              </div>
              <div class="synth-grid synth-drum-grid">
                ${this.drums.map((drum, drumIdx) => `
                  <div class="synth-row">
                    <span class="synth-note-label">${drum.charAt(0).toUpperCase() + drum.slice(1)}</span>
                    ${Array(16).fill(0).map((_, step) => `
                      <button class="synth-cell synth-cell-drum ${drumPattern[drumIdx][step] ? 'active' : ''}"
                              data-drum="${drumIdx}" data-step="${step}"></button>
                    `).join('')}
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="synth-step-indicator">
              ${Array(16).fill(0).map((_, step) => `
                <div class="synth-step-dot" data-step-indicator="${step}"></div>
              `).join('')}
            </div>
          </div>
        </main>
      </div>
    `;

    this._renderPatternsList();
    this._attachEvents();
  },

  _showEmpty() {
    this.container.querySelector('.synth-empty').style.display = 'flex';
    this.container.querySelector('.synth-editor').style.display = 'none';
    this.selectedPatternId = null;
  },

  _showEditor() {
    this.container.querySelector('.synth-empty').style.display = 'none';
    this.container.querySelector('.synth-editor').style.display = 'flex';
  },

  _emptyMelodicPattern() {
    return Array(8).fill(null).map(() => Array(16).fill(false));
  },

  _emptyDrumPattern() {
    return Array(3).fill(null).map(() => Array(16).fill(false));
  },

  _attachEvents() {
    // New pattern button
    this.container.querySelector('[data-action="new-pattern"]').addEventListener('click', () => this._newPattern());

    // Transport controls
    this.container.querySelector('[data-action="play"]').addEventListener('click', () => this._play());
    this.container.querySelector('[data-action="stop"]').addEventListener('click', () => this._stop());
    this.container.querySelector('[data-action="clear"]').addEventListener('click', () => this._clear());

    // AI button and popover
    const aiBtn = this.container.querySelector('[data-action="ai"]');
    const aiPopover = this.container.querySelector('.synth-ai-popover');

    aiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleAIPopover();
    });

    // Close popover when clicking outside
    this._onDocumentClick = (e) => {
      if (!aiPopover.contains(e.target) && !aiBtn.contains(e.target)) {
        aiPopover.style.display = 'none';
      }
    };
    document.addEventListener('click', this._onDocumentClick);

    // AI actions
    this.container.querySelector('[data-action="open-settings"]').addEventListener('click', () => {
      window.DumbOS.openModule('settings');
      aiPopover.style.display = 'none';
    });

    this.container.querySelector('[data-action="ai-generate"]').addEventListener('click', () => this._aiGenerate());
    this.container.querySelector('[data-action="ai-vary"]').addEventListener('click', () => this._aiVary());
    this.container.querySelector('[data-action="ai-humanize"]').addEventListener('click', () => this._aiHumanize());

    // Enter key in prompt textarea
    this.container.querySelector('.synth-ai-prompt').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._aiGenerate();
      }
    });

    // Export/Import
    this.container.querySelector('[data-action="export"]').addEventListener('click', () => this._exportPattern());
    const importFileInput = this.container.querySelector('[data-input="import-file"]');
    this.container.querySelector('[data-action="import"]').addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this._importPattern(e.target.files[0]);
        e.target.value = '';
      }
    });

    // Pattern title input - auto-save on change
    const titleInput = this.container.querySelector('.synth-pattern-title');
    titleInput.addEventListener('input', () => this._scheduleAutoSave());

    // Tempo slider
    const tempoSlider = this.container.querySelector('[data-control="tempo"]');
    tempoSlider.addEventListener('input', (e) => {
      const tempo = parseInt(e.target.value);
      this.container.querySelector('.synth-tempo-value').textContent = tempo;
      this.storage.set('tempo', tempo);
      if (this.isPlaying) {
        this._stop();
        this._play();
      }
      this._scheduleAutoSave();
    });

    // Waveform select
    this.container.querySelector('[data-control="waveform"]').addEventListener('change', (e) => {
      this.storage.set('waveform', e.target.value);
      this._scheduleAutoSave();
    });

    // Melodic grid clicks
    this.container.querySelectorAll('[data-note]').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const noteIdx = parseInt(e.target.dataset.note);
        const step = parseInt(e.target.dataset.step);
        e.target.classList.toggle('active');
        this._saveMelodicPattern();
        this._scheduleAutoSave();
      });
    });

    // Drum grid clicks
    this.container.querySelectorAll('[data-drum]').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const drumIdx = parseInt(e.target.dataset.drum);
        const step = parseInt(e.target.dataset.step);
        e.target.classList.toggle('active');
        this._saveDrumPattern();
        this._scheduleAutoSave();
      });
    });
  },

  _initAudio() {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  },

  _play() {
    if (this.isPlaying) return;

    this._initAudio();
    this.isPlaying = true;
    this.currentStep = 0;

    const tempo = this.storage.get('tempo', 120);
    const stepDuration = 60000 / tempo / 4; // 16th notes

    this.container.querySelector('[data-action="play"]').classList.add('playing');

    const tick = () => {
      this._playStep(this.currentStep);
      this._updateStepIndicator(this.currentStep);
      this.currentStep = (this.currentStep + 1) % 16;
    };

    tick();
    this.intervalId = setInterval(tick, stepDuration);
  },

  _stop() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.currentStep = 0;

    this.container.querySelector('[data-action="play"]').classList.remove('playing');
    this._clearStepIndicator();
  },

  _playStep(step) {
    const waveform = this.storage.get('waveform', 'sawtooth');

    // Play melodic notes
    this.container.querySelectorAll(`[data-note][data-step="${step}"].active`).forEach(cell => {
      const noteIdx = parseInt(cell.dataset.note);
      this._playNote(this.notes[noteIdx].freq, waveform);
    });

    // Play drums
    this.container.querySelectorAll(`[data-drum][data-step="${step}"].active`).forEach(cell => {
      const drumIdx = parseInt(cell.dataset.drum);
      this._playDrum(this.drums[drumIdx]);
    });
  },

  _playNote(freq, waveform) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;

    osc.type = waveform;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  },

  _playDrum(type) {
    const now = this.audioContext.currentTime;

    switch (type) {
      case 'kick':
        this._playKick(now);
        break;
      case 'snare':
        this._playSnare(now);
        break;
      case 'hihat':
        this._playHihat(now);
        break;
    }
  },

  _playKick(now) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  },

  _playSnare(now) {
    // Noise component
    const bufferSize = this.audioContext.sampleRate * 0.1;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1000, now);

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.1);

    // Tone component
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);

    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(oscGain);
    oscGain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  },

  _playHihat(now) {
    const bufferSize = this.audioContext.sampleRate * 0.05;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, now);

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.05);
  },

  _updateStepIndicator(step) {
    this.container.querySelectorAll('[data-step-indicator]').forEach((dot, idx) => {
      dot.classList.toggle('active', idx === step);
    });
  },

  _clearStepIndicator() {
    this.container.querySelectorAll('[data-step-indicator]').forEach(dot => {
      dot.classList.remove('active');
    });
  },

  _saveMelodicPattern() {
    const pattern = this._emptyMelodicPattern();
    this.container.querySelectorAll('[data-note].active').forEach(cell => {
      const noteIdx = parseInt(cell.dataset.note);
      const step = parseInt(cell.dataset.step);
      pattern[noteIdx][step] = true;
    });
    this.storage.set('melodicPattern', pattern);
  },

  _saveDrumPattern() {
    const pattern = this._emptyDrumPattern();
    this.container.querySelectorAll('[data-drum].active').forEach(cell => {
      const drumIdx = parseInt(cell.dataset.drum);
      const step = parseInt(cell.dataset.step);
      pattern[drumIdx][step] = true;
    });
    this.storage.set('drumPattern', pattern);
  },

  _clear() {
    this._stop();

    // Clear UI
    this.container.querySelectorAll('.synth-cell').forEach(cell => {
      cell.classList.remove('active');
    });

    // Clear storage
    this.storage.set('melodicPattern', this._emptyMelodicPattern());
    this.storage.set('drumPattern', this._emptyDrumPattern());
  },

  // Export pattern to JSON file
  _exportPattern() {
    // Get pattern name from selected pattern or prompt for one
    const patterns = this.storage.get('savedPatterns', []);
    const selectedPattern = patterns.find(p => p.id === this.selectedPatternId);
    let name = selectedPattern?.name || prompt('Pattern name for export:');

    if (!name) return;

    const data = {
      version: 1,
      name,
      tempo: this.storage.get('tempo', 120),
      waveform: this.storage.get('waveform', 'sawtooth'),
      melodicPattern: this.storage.get('melodicPattern', this._emptyMelodicPattern()),
      drumPattern: this.storage.get('drumPattern', this._emptyDrumPattern())
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Sanitize filename: replace spaces with dashes, remove special chars
    const filename = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Import pattern from JSON file
  _importPattern(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.melodicPattern && data.drumPattern) {
          // Create a new pattern from import
          const pattern = {
            id: this._generateId(),
            name: data.name || 'Imported Pattern',
            tempo: data.tempo || 120,
            waveform: data.waveform || 'sawtooth',
            melodicPattern: data.melodicPattern,
            drumPattern: data.drumPattern,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };

          const patterns = this.storage.get('savedPatterns', []);
          patterns.push(pattern);
          this.storage.set('savedPatterns', patterns);
          this._selectPattern(pattern.id);
          this._renderPatternsList();
        }
      } catch (err) {
        alert('Invalid pattern file');
      }
    };
    reader.readAsText(file);
  },

  // Create a new empty pattern
  _newPattern() {
    const pattern = {
      id: this._generateId(),
      name: 'New Pattern',
      tempo: 120,
      waveform: 'sawtooth',
      melodicPattern: this._emptyMelodicPattern(),
      drumPattern: this._emptyDrumPattern(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const patterns = this.storage.get('savedPatterns', []);
    patterns.push(pattern);
    this.storage.set('savedPatterns', patterns);
    this._selectPattern(pattern.id);
    this._renderPatternsList();
    // Focus title input for immediate naming
    const titleInput = this.container.querySelector('.synth-pattern-title');
    if (titleInput) {
      titleInput.focus();
      titleInput.select();
    }
  },

  // Select and load a pattern by ID
  _selectPattern(id) {
    const patterns = this.storage.get('savedPatterns', []);
    const pattern = patterns.find(p => p.id === id);
    if (!pattern) return;

    this._stop();
    this.selectedPatternId = id;
    this.storage.set('selectedPatternId', id);

    // Load into storage
    this.storage.set('tempo', pattern.tempo || 120);
    this.storage.set('waveform', pattern.waveform || 'sawtooth');
    this.storage.set('melodicPattern', pattern.melodicPattern || this._emptyMelodicPattern());
    this.storage.set('drumPattern', pattern.drumPattern || this._emptyDrumPattern());

    // Show editor
    this._showEditor();

    // Update UI elements
    const titleInput = this.container.querySelector('.synth-pattern-title');
    if (titleInput) titleInput.value = pattern.name || '';

    const tempoSlider = this.container.querySelector('[data-control="tempo"]');
    const tempoValue = this.container.querySelector('.synth-tempo-value');
    if (tempoSlider) tempoSlider.value = pattern.tempo || 120;
    if (tempoValue) tempoValue.textContent = pattern.tempo || 120;

    const waveformSelect = this.container.querySelector('[data-control="waveform"]');
    if (waveformSelect) waveformSelect.value = pattern.waveform || 'sawtooth';

    // Update grid
    const melodicPattern = pattern.melodicPattern || this._emptyMelodicPattern();
    const drumPattern = pattern.drumPattern || this._emptyDrumPattern();

    this.container.querySelectorAll('[data-note]').forEach(cell => {
      const noteIdx = parseInt(cell.dataset.note);
      const step = parseInt(cell.dataset.step);
      cell.classList.toggle('active', melodicPattern[noteIdx]?.[step] || false);
    });

    this.container.querySelectorAll('[data-drum]').forEach(cell => {
      const drumIdx = parseInt(cell.dataset.drum);
      const step = parseInt(cell.dataset.step);
      cell.classList.toggle('active', drumPattern[drumIdx]?.[step] || false);
    });

    this._renderPatternsList();
    this._updateStatus('');
  },

  // Schedule auto-save with debounce
  _scheduleAutoSave() {
    if (!this.selectedPatternId) return;
    this._updateStatus('Editing...');
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this._saveCurrentPattern(), this.SAVE_DELAY);
  },

  // Save the current pattern state
  _saveCurrentPattern() {
    if (!this.selectedPatternId) return;

    const patterns = this.storage.get('savedPatterns', []);
    const pattern = patterns.find(p => p.id === this.selectedPatternId);
    if (!pattern) return;

    const titleInput = this.container.querySelector('.synth-pattern-title');
    pattern.name = titleInput?.value?.trim() || 'Untitled';
    pattern.tempo = this.storage.get('tempo', 120);
    pattern.waveform = this.storage.get('waveform', 'sawtooth');
    pattern.melodicPattern = this.storage.get('melodicPattern', this._emptyMelodicPattern());
    pattern.drumPattern = this.storage.get('drumPattern', this._emptyDrumPattern());
    pattern.updatedAt = Date.now();

    this.storage.set('savedPatterns', patterns);
    this._renderPatternsList();
    this._updateStatus('Saved');
  },

  // Update status indicator
  _updateStatus(text) {
    const status = this.container.querySelector('.synth-pattern-status');
    if (status) status.textContent = text;
  },

  // Render the saved patterns list in sidebar
  _renderPatternsList() {
    const listEl = this.container.querySelector('.synth-patterns-list');
    if (!listEl) return;

    const patterns = this.storage.get('savedPatterns', []);

    listEl.innerHTML = patterns.length === 0
      ? '<li class="synth-patterns-empty">No saved patterns</li>'
      : patterns.map(p => `
          <li class="synth-pattern-item ${this.selectedPatternId === p.id ? 'active' : ''}" data-pattern-id="${p.id}">
            <span class="synth-pattern-name">${this._escapeHtml(p.name)}</span>
            <button class="synth-pattern-delete" data-delete-id="${p.id}" title="Delete">&times;</button>
          </li>
        `).join('');

    // Attach click handlers
    listEl.querySelectorAll('.synth-pattern-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('synth-pattern-delete')) return;
        const id = item.dataset.patternId;
        this._selectPattern(id);
      });
    });

    listEl.querySelectorAll('.synth-pattern-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteId;
        this._deletePattern(id);
      });
    });
  },

  // Delete saved pattern by ID
  _deletePattern(id) {
    const patterns = this.storage.get('savedPatterns', []);
    const index = patterns.findIndex(p => p.id === id);
    if (index === -1) return;

    patterns.splice(index, 1);
    this.storage.set('savedPatterns', patterns);

    // If we deleted the selected pattern, select another or show empty
    if (this.selectedPatternId === id) {
      if (patterns.length > 0) {
        // Select the most recently updated pattern
        const sorted = [...patterns].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        this._selectPattern(sorted[0].id);
      } else {
        this.selectedPatternId = null;
        this.storage.remove('selectedPatternId');
        this._showEmpty();
      }
    }

    this._renderPatternsList();
  },

  // Escape HTML for safe rendering
  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  // AI Features
  _toggleAIPopover() {
    const popover = this.container.querySelector('.synth-ai-popover');
    const isVisible = popover.style.display !== 'none';

    if (isVisible) {
      popover.style.display = 'none';
      return;
    }

    // Check for API key
    const hasKey = !!Storage.get('claude-api', 'apiKey', null);
    this.container.querySelector('.synth-ai-no-key').style.display = hasKey ? 'none' : 'block';
    this.container.querySelector('.synth-ai-has-key').style.display = hasKey ? 'block' : 'none';

    popover.style.display = 'block';

    if (hasKey) {
      this.container.querySelector('.synth-ai-prompt').focus();
    }
  },

  _setAILoading(loading) {
    this.isAILoading = loading;
    const btns = this.container.querySelectorAll('.synth-ai-actions button');
    const prompt = this.container.querySelector('.synth-ai-prompt');
    const status = this.container.querySelector('.synth-ai-status');

    btns.forEach(btn => btn.disabled = loading);
    prompt.disabled = loading;

    if (loading) {
      status.innerHTML = '<span class="synth-ai-loading">Generating...</span>';
    } else {
      status.innerHTML = '';
    }
  },

  _showAIError(message) {
    const status = this.container.querySelector('.synth-ai-status');
    status.innerHTML = `<span class="synth-ai-error">${this._escapeHtml(message)}</span>`;
    setTimeout(() => {
      status.innerHTML = '';
    }, 4000);
  },

  async _aiGenerate() {
    if (this.isAILoading) return;

    const prompt = this.container.querySelector('.synth-ai-prompt').value.trim();
    if (!prompt) {
      this._showAIError('Please describe a pattern');
      return;
    }

    this._setAILoading(true);

    try {
      const userMessage = `Generate a pattern for: ${prompt}`;
      const pattern = await this._callClaudeAPI(userMessage);
      this._applyPattern(pattern);
      this.container.querySelector('.synth-ai-prompt').value = '';
      this.container.querySelector('.synth-ai-popover').style.display = 'none';
      this._autoSavePattern();
    } catch (error) {
      this._showAIError(error.message);
    } finally {
      this._setAILoading(false);
    }
  },

  async _aiVary() {
    if (this.isAILoading) return;

    const currentMelodic = this.storage.get('melodicPattern', this._emptyMelodicPattern());
    const currentDrum = this.storage.get('drumPattern', this._emptyDrumPattern());

    // Check if there's anything to vary
    const hasMelodic = currentMelodic.some(row => row.some(cell => cell));
    const hasDrum = currentDrum.some(row => row.some(cell => cell));

    if (!hasMelodic && !hasDrum) {
      this._showAIError('No pattern to vary - create one first');
      return;
    }

    this._setAILoading(true);

    try {
      const currentPattern = JSON.stringify({ melodicPattern: currentMelodic, drumPattern: currentDrum });
      const userMessage = `Create a variation of this pattern. Keep the overall structure but change 10-30% of the notes for variety. Here's the current pattern:\n${currentPattern}`;
      const pattern = await this._callClaudeAPI(userMessage);
      this._applyPattern(pattern);
      this.container.querySelector('.synth-ai-popover').style.display = 'none';
      this._autoSavePattern();
    } catch (error) {
      this._showAIError(error.message);
    } finally {
      this._setAILoading(false);
    }
  },

  async _aiHumanize() {
    if (this.isAILoading) return;

    const currentMelodic = this.storage.get('melodicPattern', this._emptyMelodicPattern());
    const currentDrum = this.storage.get('drumPattern', this._emptyDrumPattern());

    // Check if there's anything to humanize
    const hasMelodic = currentMelodic.some(row => row.some(cell => cell));
    const hasDrum = currentDrum.some(row => row.some(cell => cell));

    if (!hasMelodic && !hasDrum) {
      this._showAIError('No pattern to humanize - create one first');
      return;
    }

    this._setAILoading(true);

    try {
      const currentPattern = JSON.stringify({ melodicPattern: currentMelodic, drumPattern: currentDrum });
      const userMessage = `Humanize this pattern by adding subtle imperfections. Add or remove a few notes (5-15%) to make it feel less mechanical and more like a real performance. Avoid perfect repetition. Here's the current pattern:\n${currentPattern}`;
      const pattern = await this._callClaudeAPI(userMessage);
      this._applyPattern(pattern);
      this.container.querySelector('.synth-ai-popover').style.display = 'none';
      this._autoSavePattern();
    } catch (error) {
      this._showAIError(error.message);
    } finally {
      this._setAILoading(false);
    }
  },

  _generateRandomName() {
    const adjectives = ['Cosmic', 'Neon', 'Chill', 'Dark', 'Bright', 'Deep', 'Wild', 'Soft', 'Raw', 'Hazy'];
    const nouns = ['Wave', 'Beat', 'Pulse', 'Vibe', 'Flow', 'Dream', 'Rush', 'Drift', 'Glow', 'Echo'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj} ${noun}`;
  },

  _autoSavePattern() {
    const name = this._generateRandomName();
    const pattern = {
      id: this._generateId(),
      name,
      tempo: this.storage.get('tempo', 120),
      waveform: this.storage.get('waveform', 'sawtooth'),
      melodicPattern: this.storage.get('melodicPattern', this._emptyMelodicPattern()),
      drumPattern: this.storage.get('drumPattern', this._emptyDrumPattern()),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const patterns = this.storage.get('savedPatterns', []);
    patterns.push(pattern);
    this.storage.set('savedPatterns', patterns);
    this.selectedPatternId = pattern.id;
    this.storage.set('selectedPatternId', pattern.id);
    this._showEditor();
    const titleInput = this.container.querySelector('.synth-pattern-title');
    if (titleInput) titleInput.value = name;
    this._renderPatternsList();
  },

  async _callClaudeAPI(userMessage) {
    const apiKey = Storage.get('claude-api', 'apiKey');
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: AI_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'API request failed');
    }

    // Parse the JSON response
    const content = data.content[0].text;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid pattern in response');
      }
      const pattern = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!pattern.melodicPattern || !pattern.drumPattern) {
        throw new Error('Invalid pattern structure');
      }
      if (pattern.melodicPattern.length !== 8 || pattern.drumPattern.length !== 3) {
        throw new Error('Invalid pattern dimensions');
      }

      return pattern;
    } catch (parseError) {
      throw new Error('Failed to parse pattern: ' + parseError.message);
    }
  },

  _applyPattern(pattern) {
    this._stop();

    // Save to storage
    this.storage.set('melodicPattern', pattern.melodicPattern);
    this.storage.set('drumPattern', pattern.drumPattern);

    // Update UI
    this.container.querySelectorAll('[data-note]').forEach(cell => {
      const noteIdx = parseInt(cell.dataset.note);
      const step = parseInt(cell.dataset.step);
      const isActive = pattern.melodicPattern[noteIdx][step];
      cell.classList.toggle('active', isActive);
    });

    this.container.querySelectorAll('[data-drum]').forEach(cell => {
      const drumIdx = parseInt(cell.dataset.drum);
      const step = parseInt(cell.dataset.step);
      const isActive = pattern.drumPattern[drumIdx][step];
      cell.classList.toggle('active', isActive);
    });
  },

  render() {
    let patterns = this.storage.get('savedPatterns', []);

    // Migrate old patterns without IDs
    let needsSave = false;
    patterns = patterns.map(p => {
      if (!p.id) {
        needsSave = true;
        return {
          ...p,
          id: this._generateId(),
          createdAt: p.createdAt || Date.now(),
          updatedAt: p.updatedAt || Date.now()
        };
      }
      return p;
    });
    if (needsSave) {
      this.storage.set('savedPatterns', patterns);
    }

    if (patterns.length === 0) {
      this._showEmpty();
    } else {
      // Load last selected, or most recently updated
      const lastId = this.storage.get('selectedPatternId', null);
      const sortedPatterns = [...patterns].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      const patternToLoad = patterns.find(p => p.id === lastId) || sortedPatterns[0];
      if (patternToLoad) {
        this._selectPattern(patternToLoad.id);
      } else {
        this._showEmpty();
      }
    }
  },

  destroy() {
    this._stop();
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this._onDocumentClick) {
      document.removeEventListener('click', this._onDocumentClick);
    }
  }
};

export default SynthModule;
