/**
 * Journal Module - Daily journal with calendar navigation
 */
const JournalModule = {
  id: 'journal',
  title: 'Journal',
  category: 'productivity',
  description: 'Daily journal with calendar navigation',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="17" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg>`,
  defaultSize: { width: 780, height: 550 },
  minSize: { width: 600, height: 400 },

  container: null,
  storage: null,
  entries: {},
  selectedDate: null,
  calendarMonth: null, // { year, month } (0-indexed month)
  sidebarCollapsed: false,
  viewMode: 'edit',
  marked: null,
  saveTimeout: null,
  searchOpen: false,
  SAVE_DELAY: 800,

  // DOM elements
  sidebarEl: null,
  calendarEl: null,
  editorEl: null,
  textarea: null,
  previewEl: null,
  statusEl: null,
  wordCountEl: null,
  dateHeaderEl: null,
  searchInputEl: null,
  searchResultsEl: null,
  searchContainerEl: null,

  async init(container, storage) {
    this.container = container;
    this.storage = storage;

    await this._loadMarked();
    this._loadData();
    this._buildUI();
    this._bindKeyboardShortcuts();
  },

  async _loadMarked() {
    try {
      const { marked } = await import('https://esm.sh/marked@11');
      this.marked = marked;
      this.marked.setOptions({ breaks: true, gfm: true });
    } catch (err) {
      console.error('Failed to load marked library:', err);
    }
  },

  _loadData() {
    this.entries = this.storage.get('entries', {});
    this.sidebarCollapsed = this.storage.get('sidebarCollapsed', false);
    this.viewMode = this.storage.get('viewMode', 'edit');

    // Restore selected date or default to today
    const savedDate = this.storage.get('selectedDate', null);
    this.selectedDate = savedDate || this._todayString();

    // Restore calendar month or derive from selected date
    const savedMonth = this.storage.get('calendarMonth', null);
    if (savedMonth) {
      const parts = savedMonth.split('-');
      this.calendarMonth = { year: parseInt(parts[0]), month: parseInt(parts[1]) - 1 };
    } else {
      const d = this._parseDate(this.selectedDate);
      this.calendarMonth = { year: d.getFullYear(), month: d.getMonth() };
    }
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="journal-layout ${this.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
        <aside class="journal-sidebar">
          <div class="journal-sidebar-header">
            <button class="journal-today-btn" title="Go to Today">Today</button>
            <div class="journal-sidebar-actions">
              <button class="journal-search-btn" title="Search (Ctrl+F)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              <button class="journal-menu-btn" title="More options">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
            </div>
          </div>
          <div class="journal-search-container" style="display: none;">
            <input type="text" class="journal-search-input" placeholder="Search entries...">
            <div class="journal-search-results"></div>
          </div>
          <div class="journal-calendar-container">
            <div class="journal-calendar-nav">
              <button class="journal-cal-prev" title="Previous month">&lsaquo;</button>
              <span class="journal-cal-title"></span>
              <button class="journal-cal-next" title="Next month">&rsaquo;</button>
            </div>
            <div class="journal-calendar-grid">
              <div class="journal-cal-header">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>
              <div class="journal-cal-days"></div>
            </div>
          </div>
          <div class="journal-sidebar-footer">
            <button class="journal-export-btn" title="Export Journal (Ctrl+E)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export
            </button>
            <button class="journal-import-btn" title="Import Journal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import
            </button>
            <input type="file" class="journal-import-file" accept=".json" style="display: none;">
          </div>
        </aside>
        <button class="journal-sidebar-toggle" title="Toggle Sidebar (Ctrl+B)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
        <main class="journal-main">
          <div class="journal-editor">
            <div class="journal-editor-header">
              <span class="journal-date-header"></span>
              <button class="journal-view-toggle" title="Toggle Preview (Ctrl+P)">
                <span class="view-edit-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </span>
                <span class="view-preview-icon" style="display: none;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </span>
              </button>
            </div>
            <div class="journal-content">
              <textarea class="journal-textarea" placeholder="What happened today?"></textarea>
              <div class="journal-preview"></div>
            </div>
            <div class="journal-status">
              <span class="journal-word-count">0 words</span>
              <span class="journal-save-status"></span>
            </div>
          </div>
        </main>
      </div>
    `;

    // Cache DOM elements
    this.sidebarEl = this.container.querySelector('.journal-sidebar');
    this.calendarEl = this.container.querySelector('.journal-cal-days');
    this.editorEl = this.container.querySelector('.journal-editor');
    this.textarea = this.container.querySelector('.journal-textarea');
    this.previewEl = this.container.querySelector('.journal-preview');
    this.statusEl = this.container.querySelector('.journal-save-status');
    this.wordCountEl = this.container.querySelector('.journal-word-count');
    this.dateHeaderEl = this.container.querySelector('.journal-date-header');
    this.searchInputEl = this.container.querySelector('.journal-search-input');
    this.searchResultsEl = this.container.querySelector('.journal-search-results');
    this.searchContainerEl = this.container.querySelector('.journal-search-container');

    // Bind events
    this.container.querySelector('.journal-today-btn').addEventListener('click', () => this._goToToday());
    this.container.querySelector('.journal-search-btn').addEventListener('click', () => this._toggleSearch());
    this.container.querySelector('.journal-menu-btn').addEventListener('click', (e) => this._showMenu(e));
    this.container.querySelector('.journal-cal-prev').addEventListener('click', () => this._navigateMonth(-1));
    this.container.querySelector('.journal-cal-next').addEventListener('click', () => this._navigateMonth(1));
    this.container.querySelector('.journal-sidebar-toggle').addEventListener('click', () => this._toggleSidebar());
    this.container.querySelector('.journal-view-toggle').addEventListener('click', () => this._togglePreview());
    this.container.querySelector('.journal-export-btn').addEventListener('click', () => this._exportData());
    this.container.querySelector('.journal-import-btn').addEventListener('click', () => {
      this.container.querySelector('.journal-import-file').click();
    });
    this.container.querySelector('.journal-import-file').addEventListener('change', (e) => this._importData(e));

    this.textarea.addEventListener('input', () => {
      this._scheduleAutoSave();
      this._updateWordCount();
    });

    // Search input
    this._searchTimeout = null;
    this.searchInputEl.addEventListener('input', () => {
      if (this._searchTimeout) clearTimeout(this._searchTimeout);
      this._searchTimeout = setTimeout(() => this._performSearch(), 300);
    });
    this.searchInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this._toggleSearch();
      }
    });

    // Render calendar and load entry here (not in render()) because init()
    // is async and app.js calls render() before the promise resolves.
    this._renderCalendar();
    this._selectDate(this.selectedDate);
    this._updateViewMode();
  },

  _bindKeyboardShortcuts() {
    this._keyHandler = (e) => {
      if (!this.container.closest('.window.active')) return;

      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 's') {
        e.preventDefault();
        this._save();
      } else if (isMod && e.key === 'p') {
        e.preventDefault();
        this._togglePreview();
      } else if (isMod && e.key === 'b') {
        e.preventDefault();
        this._toggleSidebar();
      } else if (isMod && e.key === 'f') {
        e.preventDefault();
        this._toggleSearch();
      } else if (isMod && e.key === 'e') {
        e.preventDefault();
        this._exportData();
      } else if (e.key === 'Escape' && this.searchOpen) {
        this._toggleSearch();
      }
    };

    window.addEventListener('keydown', this._keyHandler);
  },

  render() {
    // Calendar is rendered at the end of _buildUI() because init() is async
    // and app.js calls render() synchronously before init() resolves.
    // This is kept as a no-op so the module interface contract is satisfied.
  },

  // --- Calendar ---

  _renderCalendar() {
    const { year, month } = this.calendarMonth;
    const titleEl = this.container.querySelector('.journal-cal-title');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    titleEl.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = this._todayString();

    this.calendarEl.innerHTML = '';

    // Leading empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      const cell = document.createElement('span');
      cell.className = 'journal-cal-day other-month';
      this.calendarEl.appendChild(cell);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = this._dateString(year, month, d);
      const cell = document.createElement('span');
      cell.className = 'journal-cal-day';
      cell.textContent = d;

      if (dateStr === todayStr) cell.classList.add('today');
      if (dateStr === this.selectedDate) cell.classList.add('selected');
      if (this.entries[dateStr]) cell.classList.add('has-entry');

      cell.addEventListener('click', () => this._selectDate(dateStr));
      this.calendarEl.appendChild(cell);
    }

    // Save calendar month
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    this.storage.set('calendarMonth', monthStr);
  },

  _navigateMonth(delta) {
    let { year, month } = this.calendarMonth;
    month += delta;
    if (month < 0) { month = 11; year--; }
    if (month > 11) { month = 0; year++; }
    this.calendarMonth = { year, month };
    this._renderCalendar();
  },

  _goToToday() {
    const todayStr = this._todayString();
    const today = this._parseDate(todayStr);
    this.calendarMonth = { year: today.getFullYear(), month: today.getMonth() };
    this._renderCalendar();
    this._selectDate(todayStr);
  },

  // --- Entries ---

  _selectDate(dateStr) {
    // Flush pending save for current entry before switching
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
      this._save();
    }

    this.selectedDate = dateStr;
    this.storage.set('selectedDate', dateStr);

    // Update calendar selection
    this.calendarEl.querySelectorAll('.journal-cal-day').forEach(el => {
      el.classList.remove('selected');
    });
    // Find and select the matching day
    const d = this._parseDate(dateStr);
    if (d.getFullYear() === this.calendarMonth.year && d.getMonth() === this.calendarMonth.month) {
      const cells = this.calendarEl.querySelectorAll('.journal-cal-day:not(.other-month)');
      const dayIdx = d.getDate() - 1;
      if (cells[dayIdx]) cells[dayIdx].classList.add('selected');
    }

    // Update date header
    this.dateHeaderEl.textContent = this._formatDate(dateStr);

    // Load entry content
    const entry = this.entries[dateStr];
    this.textarea.value = entry ? entry.content : '';
    this._updateWordCount();
    this._renderPreview();
    this._updateStatus('');

    if (this.viewMode === 'edit') {
      this.textarea.focus();
    }
  },

  _formatDate(dateStr) {
    const d = this._parseDate(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  },

  _deleteEntry() {
    if (!this.selectedDate || !this.entries[this.selectedDate]) return;
    if (!confirm('Delete this journal entry?')) return;

    delete this.entries[this.selectedDate];
    this._saveEntries();
    this.textarea.value = '';
    this._updateWordCount();
    this._renderCalendar();
    this._updateStatus('Deleted');
    setTimeout(() => this._updateStatus(''), 2000);
  },

  _showMenu(e) {
    // Import ContextMenu dynamically to avoid circular deps
    import('../../core/context-menu.js').then(({ default: ContextMenu }) => {
      const rect = e.target.closest('button').getBoundingClientRect();
      ContextMenu.show(rect.left, rect.bottom + 4, [
        {
          label: 'Delete this entry',
          action: () => this._deleteEntry(),
          disabled: !this.entries[this.selectedDate]
        }
      ]);
    });
  },

  // --- Save ---

  _scheduleAutoSave() {
    this._updateStatus('Saving...');
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this._save();
    }, this.SAVE_DELAY);
  },

  _save() {
    if (!this.selectedDate) return;

    const content = this.textarea.value;
    const trimmed = content.trim();

    if (!trimmed) {
      // Remove empty entry
      if (this.entries[this.selectedDate]) {
        delete this.entries[this.selectedDate];
        this._saveEntries();
        this._renderCalendar();
      }
      this._updateStatus('');
      return;
    }

    const existing = this.entries[this.selectedDate];
    const now = Date.now();

    this.entries[this.selectedDate] = {
      date: this.selectedDate,
      content: content,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    this._saveEntries();
    this._renderCalendar();
    this._renderPreview();
    this._updateStatus('Saved');
    setTimeout(() => this._updateStatus(''), 2000);
  },

  _saveEntries() {
    this.storage.set('entries', this.entries);
  },

  // --- Preview ---

  _togglePreview() {
    this.viewMode = this.viewMode === 'edit' ? 'preview' : 'edit';
    this.storage.set('viewMode', this.viewMode);
    this._updateViewMode();
    this._renderPreview();
  },

  _updateViewMode() {
    const layout = this.container.querySelector('.journal-layout');
    const editIcon = this.container.querySelector('.view-edit-icon');
    const previewIcon = this.container.querySelector('.view-preview-icon');

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

  _renderPreview() {
    if (!this.marked || this.viewMode !== 'preview') return;
    const parsed = this.marked.parse(this.textarea.value);
    this.previewEl.innerHTML = this._sanitizePreview(parsed);
  },

  _sanitizePreview(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('script, style, iframe, object, embed, form').forEach(el => el.remove());
    tmp.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(attr => {
        if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
      });
    });
    return tmp.innerHTML;
  },

  // --- Sidebar ---

  _toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.storage.set('sidebarCollapsed', this.sidebarCollapsed);
    const layout = this.container.querySelector('.journal-layout');
    layout.classList.toggle('sidebar-collapsed', this.sidebarCollapsed);
  },

  // --- Search ---

  _toggleSearch() {
    this.searchOpen = !this.searchOpen;
    const calContainer = this.container.querySelector('.journal-calendar-container');

    if (this.searchOpen) {
      this.searchContainerEl.style.display = 'flex';
      calContainer.style.display = 'none';
      this.searchInputEl.value = '';
      this.searchResultsEl.innerHTML = '';
      this.searchInputEl.focus();
    } else {
      this.searchContainerEl.style.display = 'none';
      calContainer.style.display = 'block';
      this.searchInputEl.value = '';
      this.searchResultsEl.innerHTML = '';
    }
  },

  _performSearch() {
    const query = this.searchInputEl.value.trim();
    if (query.length < 2) {
      this.searchResultsEl.innerHTML = '<div class="journal-search-empty">Type at least 2 characters</div>';
      return;
    }

    const queryLower = query.toLowerCase();
    const results = [];

    for (const [dateStr, entry] of Object.entries(this.entries)) {
      const idx = entry.content.toLowerCase().indexOf(queryLower);
      if (idx !== -1) {
        // Extract context snippet around match
        const start = Math.max(0, idx - 20);
        const end = Math.min(entry.content.length, idx + query.length + 40);
        let snippet = entry.content.slice(start, end).replace(/\n/g, ' ');
        if (start > 0) snippet = '...' + snippet;
        if (end < entry.content.length) snippet += '...';

        results.push({ dateStr, snippet, matchIdx: idx - start });
      }
    }

    // Sort by date descending
    results.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

    if (results.length === 0) {
      this.searchResultsEl.innerHTML = '<div class="journal-search-empty">No results found</div>';
      return;
    }

    this.searchResultsEl.innerHTML = results.map(r => {
      // Highlight match in snippet
      const escaped = this._escapeHtml(r.snippet);
      const qEscaped = this._escapeHtml(query);
      const highlighted = escaped.replace(
        new RegExp(qEscaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        match => `<mark>${match}</mark>`
      );
      return `<div class="journal-search-result" data-date="${r.dateStr}">
        <div class="journal-search-result-date">${this._formatDate(r.dateStr)}</div>
        <div class="journal-search-result-snippet">${highlighted}</div>
      </div>`;
    }).join('');

    this.searchResultsEl.querySelectorAll('.journal-search-result').forEach(el => {
      el.addEventListener('click', () => {
        const dateStr = el.dataset.date;
        // Navigate calendar to that month
        const d = this._parseDate(dateStr);
        this.calendarMonth = { year: d.getFullYear(), month: d.getMonth() };
        this._toggleSearch();
        this._renderCalendar();
        this._selectDate(dateStr);
      });
    });
  },

  // --- Export/Import ---

  _exportData() {
    const data = {
      version: 1,
      app: 'dumbos-journal',
      exportedAt: new Date().toISOString(),
      entryCount: Object.keys(this.entries).length,
      entries: this.entries
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-export-${this._todayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  _importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);

        // Validate
        if (!data || data.app !== 'dumbos-journal' || !data.version || !data.entries) {
          alert('Invalid journal file. Expected a DumbOS Journal export.');
          return;
        }

        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        let added = 0, updated = 0, kept = 0;

        for (const [dateStr, entry] of Object.entries(data.entries)) {
          if (!datePattern.test(dateStr)) continue;

          const importedUpdatedAt = entry.updatedAt || 0;

          if (!this.entries[dateStr]) {
            // New entry
            this.entries[dateStr] = entry;
            added++;
          } else if (importedUpdatedAt > (this.entries[dateStr].updatedAt || 0)) {
            // Imported is newer
            this.entries[dateStr] = entry;
            updated++;
          } else {
            // Local is newer or same
            kept++;
          }
        }

        this._saveEntries();
        this._renderCalendar();

        // Reload current entry if it was affected
        if (this.selectedDate) {
          const entry = this.entries[this.selectedDate];
          this.textarea.value = entry ? entry.content : '';
          this._updateWordCount();
          this._renderPreview();
        }

        alert(`Import complete: ${added} new, ${updated} updated, ${kept} kept (local was newer)`);
      } catch (err) {
        alert('Failed to parse import file: ' + err.message);
      }
    };
    reader.readAsText(file);

    // Reset file input so the same file can be re-imported
    e.target.value = '';
  },

  // --- Utility ---

  _todayString() {
    const d = new Date();
    return this._dateString(d.getFullYear(), d.getMonth(), d.getDate());
  },

  _dateString(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  },

  _parseDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  },

  _updateWordCount() {
    const text = this.textarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    this.wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
  },

  _updateStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
  },

  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  destroy() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
      this._save();
    }
    if (this._searchTimeout) {
      clearTimeout(this._searchTimeout);
      this._searchTimeout = null;
    }
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
    }
  }
};

export default JournalModule;
