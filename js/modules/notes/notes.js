/**
 * Notes Module - Multi-note notepad with auto-save
 */
const NotesModule = {
  id: 'notes',
  title: 'Notes',
  category: 'productivity',
  description: 'Quick notes with auto-save',
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  defaultSize: { width: 550, height: 400 },
  minSize: { width: 400, height: 300 },

  container: null,
  storage: null,
  notes: [],
  selectedNoteId: null,
  textarea: null,
  titleInput: null,
  saveTimeout: null,
  SAVE_DELAY: 500,

  /**
   * Initialize the module
   */
  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this._loadNotes();
    this._buildUI();
  },

  /**
   * Load notes from storage, migrating old format if needed
   */
  _loadNotes() {
    this.notes = this.storage.get('notes', null);

    // Migration: check for old single-note format
    if (this.notes === null) {
      const oldContent = this.storage.get('content', null);
      if (oldContent !== null) {
        // Migrate old single note to new format
        this.notes = [{
          id: this._generateId(),
          title: 'My Notes',
          content: oldContent,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }];
        this._saveNotes();
        this.storage.remove('content');
      } else {
        this.notes = [];
      }
    }

    this.selectedNoteId = this.storage.get('selectedNoteId', null);
  },

  /**
   * Build the notes UI
   */
  _buildUI() {
    this.container.innerHTML = `
      <div class="notes-layout">
        <aside class="notes-sidebar">
          <div class="notes-sidebar-header">
            <span>Notes</span>
            <button class="notes-add-btn" title="New Note">+</button>
          </div>
          <ul class="notes-list"></ul>
        </aside>
        <main class="notes-main">
          <div class="notes-empty">
            <p>Select a note or create a new one</p>
          </div>
          <div class="notes-editor" style="display: none;">
            <div class="notes-editor-header">
              <input type="text" class="notes-title-input" placeholder="Note title...">
            </div>
            <textarea class="notes-textarea" placeholder="Start typing..."></textarea>
            <div class="notes-status">
              <span class="notes-status-text"></span>
            </div>
          </div>
        </main>
      </div>
    `;

    this.notesListEl = this.container.querySelector('.notes-list');
    this.emptyEl = this.container.querySelector('.notes-empty');
    this.editorEl = this.container.querySelector('.notes-editor');
    this.textarea = this.container.querySelector('.notes-textarea');
    this.titleInput = this.container.querySelector('.notes-title-input');
    this.statusEl = this.container.querySelector('.notes-status-text');

    // Event listeners
    this.container.querySelector('.notes-add-btn').addEventListener('click', () => this._addNote());
    this.textarea.addEventListener('input', () => this._scheduleAutoSave());
    this.titleInput.addEventListener('input', () => this._scheduleAutoSave());
  },

  /**
   * Render the notes list
   */
  render() {
    this._renderNotesList();

    // Restore previously selected note
    if (this.selectedNoteId !== null) {
      const note = this.notes.find(n => n.id === this.selectedNoteId);
      if (note) {
        this._selectNote(this.selectedNoteId);
      } else {
        this.selectedNoteId = null;
        this.storage.remove('selectedNoteId');
      }
    }
  },

  /**
   * Render notes list
   */
  _renderNotesList() {
    this.notesListEl.innerHTML = '';

    // Sort by updatedAt, most recent first
    const sortedNotes = [...this.notes].sort((a, b) => b.updatedAt - a.updatedAt);

    sortedNotes.forEach(note => {
      const li = document.createElement('li');
      li.className = 'notes-list-item';
      if (this.selectedNoteId === note.id) {
        li.classList.add('active');
      }

      const preview = this._getPreview(note.content);

      li.innerHTML = `
        <div class="notes-item-content">
          <span class="notes-item-title">${this._escapeHtml(note.title || 'Untitled')}</span>
          <span class="notes-item-preview">${this._escapeHtml(preview)}</span>
        </div>
        <button class="notes-remove-btn" title="Delete">&times;</button>
      `;

      li.querySelector('.notes-item-content').addEventListener('click', () => this._selectNote(note.id));
      li.querySelector('.notes-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this._removeNote(note.id);
      });

      this.notesListEl.appendChild(li);
    });
  },

  /**
   * Get preview text from content
   */
  _getPreview(content) {
    if (!content) return 'Empty note';
    const firstLine = content.split('\n')[0].trim();
    return firstLine.slice(0, 50) || 'Empty note';
  },

  /**
   * Add a new note
   */
  _addNote() {
    const note = {
      id: this._generateId(),
      title: 'New Note',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.notes.push(note);
    this._saveNotes();
    this._renderNotesList();
    this._selectNote(note.id);

    // Focus the title input for immediate editing
    this.titleInput.select();
  },

  /**
   * Remove a note
   */
  _removeNote(id) {
    const index = this.notes.findIndex(n => n.id === id);
    if (index === -1) return;

    this.notes.splice(index, 1);
    this._saveNotes();

    if (this.selectedNoteId === id) {
      this.selectedNoteId = null;
      this.storage.remove('selectedNoteId');
      this._showEmpty();
    }

    this._renderNotesList();
  },

  /**
   * Select a note
   */
  _selectNote(id) {
    const note = this.notes.find(n => n.id === id);
    if (!note) return;

    this.selectedNoteId = id;
    this.storage.set('selectedNoteId', id);

    this.emptyEl.style.display = 'none';
    this.editorEl.style.display = 'flex';

    this.titleInput.value = note.title || '';
    this.textarea.value = note.content || '';

    this._renderNotesList();
    this.textarea.focus();
  },

  /**
   * Show empty state
   */
  _showEmpty() {
    this.editorEl.style.display = 'none';
    this.emptyEl.style.display = 'flex';
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
   * Save current note
   */
  _save() {
    if (this.selectedNoteId === null) return;

    const note = this.notes.find(n => n.id === this.selectedNoteId);
    if (!note) return;

    note.title = this.titleInput.value;
    note.content = this.textarea.value;
    note.updatedAt = Date.now();

    this._saveNotes();
    this._renderNotesList();
    this._updateStatus('Saved');

    // Clear status after a moment
    setTimeout(() => {
      this._updateStatus('');
    }, 2000);
  },

  /**
   * Save notes to storage
   */
  _saveNotes() {
    this.storage.set('notes', this.notes);
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
   * Generate unique ID
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Escape HTML
   */
  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
