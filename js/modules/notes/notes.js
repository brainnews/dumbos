/**
 * Notes Module - Simple notepad with auto-save
 */
const NotesModule = {
  id: 'notes',
  title: 'Notes',
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  defaultSize: { width: 400, height: 350 },
  minSize: { width: 250, height: 200 },

  container: null,
  storage: null,
  textarea: null,
  saveTimeout: null,
  SAVE_DELAY: 500,

  /**
   * Initialize the module
   */
  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this._buildUI();
    this._loadContent();
  },

  /**
   * Build the notes UI
   */
  _buildUI() {
    this.container.innerHTML = `
      <div class="notes-container">
        <textarea class="notes-textarea" placeholder="Start typing..."></textarea>
        <div class="notes-status">
          <span class="notes-status-text"></span>
        </div>
      </div>
    `;

    this.textarea = this.container.querySelector('.notes-textarea');
    this.statusEl = this.container.querySelector('.notes-status-text');

    // Auto-save on input with debounce
    this.textarea.addEventListener('input', () => this._scheduleAutoSave());
  },

  /**
   * Load saved content
   */
  _loadContent() {
    const content = this.storage.get('content', '');
    this.textarea.value = content;
  },

  /**
   * Schedule auto-save with debounce
   */
  _scheduleAutoSave() {
    this._updateStatus('Typing...');

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this._save();
    }, this.SAVE_DELAY);
  },

  /**
   * Save content to storage
   */
  _save() {
    this.storage.set('content', this.textarea.value);
    this._updateStatus('Saved');

    // Clear status after a moment
    setTimeout(() => {
      this._updateStatus('');
    }, 2000);
  },

  /**
   * Update status display
   */
  _updateStatus(text) {
    if (this.statusEl) {
      this.statusEl.textContent = text;
    }
  },

  /**
   * Render (called after init)
   */
  render() {
    this.textarea.focus();
  },

  /**
   * Cleanup
   */
  destroy() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      // Force save on close
      this._save();
    }
  }
};

export default NotesModule;
