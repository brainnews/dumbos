/**
 * Writing Module - Distraction-free markdown writing app
 */
const WritingModule = {
  id: 'writing',
  title: 'Writing',
  category: 'productivity',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`,
  defaultSize: { width: 800, height: 600 },
  minSize: { width: 500, height: 400 },

  container: null,
  storage: null,
  documents: [],
  selectedDocumentId: null,
  viewMode: 'edit',
  sidebarCollapsed: false,
  marked: null,
  saveTimeout: null,
  SAVE_DELAY: 1000,

  // DOM elements
  sidebarEl: null,
  documentListEl: null,
  editorEl: null,
  emptyEl: null,
  titleInput: null,
  textarea: null,
  previewEl: null,
  statusEl: null,
  wordCountEl: null,
  viewToggleBtn: null,

  /**
   * Initialize the module
   */
  async init(container, storage) {
    this.container = container;
    this.storage = storage;

    await this._loadMarked();
    this._loadData();
    this._buildUI();
    this._bindKeyboardShortcuts();
  },

  /**
   * Load marked library from esm.sh
   */
  async _loadMarked() {
    try {
      const { marked } = await import('https://esm.sh/marked@11');
      this.marked = marked;
      this.marked.setOptions({
        breaks: true,
        gfm: true
      });
    } catch (err) {
      console.error('Failed to load marked library:', err);
    }
  },

  /**
   * Load data from storage
   */
  _loadData() {
    this.documents = this.storage.get('documents', []);
    this.selectedDocumentId = this.storage.get('selectedDocumentId', null);
    this.sidebarCollapsed = this.storage.get('sidebarCollapsed', false);
    this.viewMode = this.storage.get('viewMode', 'edit');
  },

  /**
   * Build the UI
   */
  _buildUI() {
    this.container.innerHTML = `
      <div class="writing-layout ${this.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
        <aside class="writing-sidebar">
          <div class="writing-sidebar-header">
            <span>Documents</span>
            <button class="writing-new-btn" title="New Document (Ctrl+N)">+</button>
          </div>
          <ul class="writing-document-list"></ul>
          <div class="writing-sidebar-footer">
            <button class="writing-export-btn" title="Export as Markdown (Ctrl+E)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export .md
            </button>
          </div>
        </aside>
        <button class="writing-sidebar-toggle" title="Toggle Sidebar (Ctrl+B)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
        <main class="writing-main">
          <div class="writing-empty">
            <p>Select a document or create a new one</p>
            <button class="writing-empty-new-btn">+ New Document</button>
          </div>
          <div class="writing-editor" style="display: none;">
            <div class="writing-editor-header">
              <input type="text" class="writing-title-input" placeholder="Untitled Document">
              <button class="writing-view-toggle" title="Toggle Preview (Ctrl+P)">
                <span class="view-edit-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  Preview
                </span>
                <span class="view-preview-icon" style="display: none;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit
                </span>
              </button>
            </div>
            <div class="writing-content">
              <textarea class="writing-textarea" placeholder="Start writing..."></textarea>
              <div class="writing-preview"></div>
            </div>
            <div class="writing-status">
              <span class="writing-word-count">0 words</span>
              <span class="writing-save-status"></span>
            </div>
          </div>
        </main>
      </div>
    `;

    // Cache DOM elements
    this.sidebarEl = this.container.querySelector('.writing-sidebar');
    this.documentListEl = this.container.querySelector('.writing-document-list');
    this.emptyEl = this.container.querySelector('.writing-empty');
    this.editorEl = this.container.querySelector('.writing-editor');
    this.titleInput = this.container.querySelector('.writing-title-input');
    this.textarea = this.container.querySelector('.writing-textarea');
    this.previewEl = this.container.querySelector('.writing-preview');
    this.statusEl = this.container.querySelector('.writing-save-status');
    this.wordCountEl = this.container.querySelector('.writing-word-count');
    this.viewToggleBtn = this.container.querySelector('.writing-view-toggle');

    // Bind events
    this.container.querySelector('.writing-new-btn').addEventListener('click', () => this._createDocument());
    this.container.querySelector('.writing-empty-new-btn').addEventListener('click', () => this._createDocument());
    this.container.querySelector('.writing-export-btn').addEventListener('click', () => this._exportMarkdown());
    this.container.querySelector('.writing-sidebar-toggle').addEventListener('click', () => this._toggleSidebar());
    this.viewToggleBtn.addEventListener('click', () => this._togglePreview());

    this.textarea.addEventListener('input', () => {
      this._scheduleAutoSave();
      this._updateWordCount();
    });
    this.titleInput.addEventListener('input', () => this._scheduleAutoSave());
  },

  /**
   * Bind keyboard shortcuts
   */
  _bindKeyboardShortcuts() {
    this._keyHandler = (e) => {
      // Only handle if this module's window is focused
      if (!this.container.closest('.window.active')) return;

      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 'p') {
        e.preventDefault();
        this._togglePreview();
      } else if (isMod && e.key === 'b') {
        e.preventDefault();
        this._toggleSidebar();
      } else if (isMod && e.key === 'n') {
        e.preventDefault();
        this._createDocument();
      } else if (isMod && e.key === 's') {
        e.preventDefault();
        this._save();
      } else if (isMod && e.key === 'e') {
        e.preventDefault();
        this._exportMarkdown();
      }
    };

    window.addEventListener('keydown', this._keyHandler);
  },

  /**
   * Render the module
   */
  render() {
    this._renderDocumentList();
    this._updateViewMode();

    // Restore selected document
    if (this.selectedDocumentId) {
      const doc = this.documents.find(d => d.id === this.selectedDocumentId);
      if (doc) {
        this._selectDocument(this.selectedDocumentId);
      } else {
        this.selectedDocumentId = null;
        this.storage.remove('selectedDocumentId');
      }
    }
  },

  /**
   * Render the document list
   */
  _renderDocumentList() {
    this.documentListEl.innerHTML = '';

    // Sort by updatedAt, most recent first
    const sortedDocs = [...this.documents].sort((a, b) => b.updatedAt - a.updatedAt);

    sortedDocs.forEach(doc => {
      const li = document.createElement('li');
      li.className = 'writing-doc-item';
      if (this.selectedDocumentId === doc.id) {
        li.classList.add('active');
      }

      const preview = this._getPreview(doc.content);
      const date = new Date(doc.updatedAt).toLocaleDateString();

      li.innerHTML = `
        <div class="writing-doc-content">
          <span class="writing-doc-title">${this._escapeHtml(doc.title || 'Untitled')}</span>
          <span class="writing-doc-meta">${this._escapeHtml(preview)} · ${date}</span>
        </div>
        <button class="writing-doc-delete" title="Delete">&times;</button>
      `;

      li.querySelector('.writing-doc-content').addEventListener('click', () => this._selectDocument(doc.id));
      li.querySelector('.writing-doc-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        this._deleteDocument(doc.id);
      });

      this.documentListEl.appendChild(li);
    });
  },

  /**
   * Get preview text from content
   */
  _getPreview(content) {
    if (!content) return 'Empty document';
    // Strip markdown syntax for preview
    const text = content.replace(/[#*`_~\[\]()]/g, '').trim();
    const firstLine = text.split('\n')[0];
    return firstLine.slice(0, 40) || 'Empty document';
  },

  /**
   * Create a new document
   */
  _createDocument() {
    const doc = {
      id: this._generateId(),
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.documents.push(doc);
    this._saveDocuments();
    this._renderDocumentList();
    this._selectDocument(doc.id);
    this.titleInput.focus();
  },

  /**
   * Select a document
   */
  _selectDocument(id) {
    const doc = this.documents.find(d => d.id === id);
    if (!doc) return;

    this.selectedDocumentId = id;
    this.storage.set('selectedDocumentId', id);

    this.emptyEl.style.display = 'none';
    this.editorEl.style.display = 'flex';

    this.titleInput.value = doc.title || '';
    this.textarea.value = doc.content || '';

    this._updateWordCount();
    this._renderDocumentList();
    this._renderPreview();

    if (this.viewMode === 'edit') {
      this.textarea.focus();
    }
  },

  /**
   * Delete a document
   */
  _deleteDocument(id) {
    if (!confirm('Delete this document?')) return;

    const index = this.documents.findIndex(d => d.id === id);
    if (index === -1) return;

    this.documents.splice(index, 1);
    this._saveDocuments();

    if (this.selectedDocumentId === id) {
      this.selectedDocumentId = null;
      this.storage.remove('selectedDocumentId');
      this._showEmpty();
    }

    this._renderDocumentList();
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
    this._updateStatus('Saving...');

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this._save();
    }, this.SAVE_DELAY);
  },

  /**
   * Save current document
   */
  _save() {
    if (!this.selectedDocumentId) return;

    const doc = this.documents.find(d => d.id === this.selectedDocumentId);
    if (!doc) return;

    doc.title = this.titleInput.value;
    doc.content = this.textarea.value;
    doc.updatedAt = Date.now();

    this._saveDocuments();
    this._renderDocumentList();
    this._renderPreview();
    this._updateStatus('Saved');

    setTimeout(() => {
      this._updateStatus('');
    }, 2000);
  },

  /**
   * Save documents to storage
   */
  _saveDocuments() {
    this.storage.set('documents', this.documents);
  },

  /**
   * Toggle preview mode
   */
  _togglePreview() {
    this.viewMode = this.viewMode === 'edit' ? 'preview' : 'edit';
    this.storage.set('viewMode', this.viewMode);
    this._updateViewMode();
    this._renderPreview();
  },

  /**
   * Update view mode UI
   */
  _updateViewMode() {
    const layout = this.container.querySelector('.writing-layout');
    const editIcon = this.viewToggleBtn.querySelector('.view-edit-icon');
    const previewIcon = this.viewToggleBtn.querySelector('.view-preview-icon');

    if (this.viewMode === 'preview') {
      layout.classList.add('preview-mode');
      editIcon.style.display = 'none';
      previewIcon.style.display = 'flex';
      this.textarea.style.display = 'none';
      this.previewEl.style.display = 'block';
    } else {
      layout.classList.remove('preview-mode');
      editIcon.style.display = 'flex';
      previewIcon.style.display = 'none';
      this.textarea.style.display = 'block';
      this.previewEl.style.display = 'none';
    }
  },

  /**
   * Render markdown preview
   */
  _renderPreview() {
    if (!this.marked || this.viewMode !== 'preview') return;

    const content = this.textarea.value;
    this.previewEl.innerHTML = this.marked.parse(content);
  },

  /**
   * Toggle sidebar
   */
  _toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.storage.set('sidebarCollapsed', this.sidebarCollapsed);

    const layout = this.container.querySelector('.writing-layout');
    if (this.sidebarCollapsed) {
      layout.classList.add('sidebar-collapsed');
    } else {
      layout.classList.remove('sidebar-collapsed');
    }
  },

  /**
   * Export current document as markdown
   */
  _exportMarkdown() {
    if (!this.selectedDocumentId) return;

    const doc = this.documents.find(d => d.id === this.selectedDocumentId);
    if (!doc) return;

    const filename = (doc.title || 'untitled').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const blob = new Blob([doc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    a.click();

    URL.revokeObjectURL(url);
  },

  /**
   * Update word count
   */
  _updateWordCount() {
    const text = this.textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    this.wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
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
      this._save();
    }

    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
    }
  }
};

export default WritingModule;
