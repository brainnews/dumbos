/**
 * Code Editor Module - Simple HTML/CSS/JS editor with live preview
 */
import Storage from '../../core/storage.js';

const CodeEditorModule = {
  id: 'codeeditor',
  title: 'Code Editor',
  category: 'productivity',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  defaultSize: { width: 900, height: 600 },
  minSize: { width: 600, height: 400 },

  container: null,
  storage: null,
  editors: {},
  currentTab: 'html',
  editorViews: {},
  autoRunEnabled: true,
  _currentPageId: null,
  _consoleMessages: [],
  _messageListener: null,
  _autoSaveTimeout: null,

  // Default starter code
  defaults: {
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My Page</title>
</head>
<body>
  <h1>Hello, World!</h1>
  <p>Start editing to see your changes.</p>
</body>
</html>`,
    css: `body {
  font-family: system-ui, sans-serif;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  min-height: 100vh;
  margin: 0;
}

h1 {
  margin-top: 0;
}`,
    js: `// Your JavaScript code here
console.log('Hello from Code Editor!');`
  },

  async init(container, storage) {
    this.container = container;
    this.storage = storage;
    this._consoleMessages = [];
    await this._loadCodeMirror();
    this._buildUI();
    this._initEditors();
    this._setupConsoleListener();
    this._runCode();
  },

  async _loadCodeMirror() {
    // Check if already loaded
    if (window.CM) return;

    // Load CodeMirror from CDN
    const modules = await Promise.all([
      import('https://esm.sh/@codemirror/state@6'),
      import('https://esm.sh/@codemirror/view@6'),
      import('https://esm.sh/@codemirror/commands@6'),
      import('https://esm.sh/@codemirror/language@6'),
      import('https://esm.sh/@codemirror/lang-html@6'),
      import('https://esm.sh/@codemirror/lang-css@6'),
      import('https://esm.sh/@codemirror/lang-javascript@6'),
      import('https://esm.sh/@codemirror/theme-one-dark@6')
    ]);

    window.CM = {
      state: modules[0],
      view: modules[1],
      commands: modules[2],
      language: modules[3],
      html: modules[4],
      css: modules[5],
      javascript: modules[6],
      theme: modules[7]
    };
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="codeeditor-container">
        <div class="codeeditor-toolbar">
          <div class="codeeditor-tabs">
            <button class="codeeditor-tab active" data-tab="html">HTML</button>
            <button class="codeeditor-tab" data-tab="css">CSS</button>
            <button class="codeeditor-tab" data-tab="js">JS</button>
          </div>
          <div class="codeeditor-actions">
            <button class="codeeditor-btn" data-action="save">Save</button>
            <button class="codeeditor-btn codeeditor-btn-secondary" data-action="pages">Pages</button>
            <button class="codeeditor-btn" data-action="run">Run</button>
            <button class="codeeditor-btn codeeditor-btn-secondary" data-action="reset">Reset</button>
          </div>
        </div>
        <div class="codeeditor-main">
          <div class="codeeditor-editor-pane">
            <div class="codeeditor-editor-wrapper" data-editor="html"></div>
            <div class="codeeditor-editor-wrapper codeeditor-hidden" data-editor="css"></div>
            <div class="codeeditor-editor-wrapper codeeditor-hidden" data-editor="js"></div>
          </div>
          <div class="codeeditor-divider"></div>
          <div class="codeeditor-preview-pane">
            <div class="codeeditor-preview-header">
              <span>Preview</span>
              <button class="codeeditor-console-toggle" title="Toggle Console">Console</button>
            </div>
            <iframe class="codeeditor-preview-frame" sandbox="allow-scripts"></iframe>
            <div class="codeeditor-console">
              <div class="codeeditor-console-header">
                <span>Console</span>
                <button class="codeeditor-console-clear" title="Clear Console">Clear</button>
              </div>
              <div class="codeeditor-console-output"></div>
            </div>
          </div>
        </div>
        <div class="codeeditor-save-dialog codeeditor-hidden">
          <div class="codeeditor-save-dialog-content">
            <h3>Save Page</h3>
            <input type="text" class="codeeditor-save-input" placeholder="Page name" autocomplete="off" />
            <div class="codeeditor-save-actions">
              <button class="codeeditor-btn" data-save="confirm">Save</button>
              <button class="codeeditor-btn codeeditor-btn-secondary" data-save="cancel">Cancel</button>
            </div>
          </div>
        </div>
        <div class="codeeditor-pages-panel codeeditor-hidden">
          <div class="codeeditor-pages-header">
            <span>Saved Pages</span>
            <button class="codeeditor-pages-close">&times;</button>
          </div>
          <div class="codeeditor-pages-list"></div>
        </div>
      </div>
    `;

    // Tab switching
    this.container.querySelectorAll('.codeeditor-tab').forEach(tab => {
      tab.addEventListener('click', () => this._switchTab(tab.dataset.tab));
    });

    // Actions
    this.container.querySelector('[data-action="run"]').addEventListener('click', () => {
      this._runCode();
    });

    this.container.querySelector('[data-action="reset"]').addEventListener('click', () => {
      if (confirm('Reset all code to defaults?')) {
        this._resetCode();
      }
    });

    // Save button - auto-save if editing existing page, else show dialog
    this.container.querySelector('[data-action="save"]').addEventListener('click', () => {
      if (this._currentPageId) {
        this._autoSaveCurrentPage();
      } else {
        this._showSaveDialog();
      }
    });

    // Pages button
    this.container.querySelector('[data-action="pages"]').addEventListener('click', () => {
      this._showPagesPanel();
    });

    // Save dialog actions
    this.container.querySelector('[data-save="confirm"]').addEventListener('click', () => {
      const input = this.container.querySelector('.codeeditor-save-input');
      const name = input.value.trim();
      if (name) {
        this._savePage(name);
        this._hideSaveDialog();
      }
    });

    this.container.querySelector('[data-save="cancel"]').addEventListener('click', () => {
      this._hideSaveDialog();
    });

    this.container.querySelector('.codeeditor-save-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const name = e.target.value.trim();
        if (name) {
          this._savePage(name);
          this._hideSaveDialog();
        }
      } else if (e.key === 'Escape') {
        this._hideSaveDialog();
      }
    });

    // Pages panel close
    this.container.querySelector('.codeeditor-pages-close').addEventListener('click', () => {
      this._hidePagesPanel();
    });

    // Divider drag to resize
    this._initDividerDrag();

    // Console toggle and clear
    this.container.querySelector('.codeeditor-console-toggle').addEventListener('click', () => {
      this._toggleConsole();
    });

    this.container.querySelector('.codeeditor-console-clear').addEventListener('click', () => {
      this._clearConsole();
    });
  },

  _initEditors() {
    const { EditorState } = window.CM.state;
    const { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } = window.CM.view;
    const { defaultKeymap, history, historyKeymap, indentWithTab } = window.CM.commands;
    const { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } = window.CM.language;
    const { html } = window.CM.html;
    const { css } = window.CM.css;
    const { javascript } = window.CM.javascript;
    const { oneDark } = window.CM.theme;

    const languages = {
      html: html(),
      css: css(),
      js: javascript()
    };

    ['html', 'css', 'js'].forEach(type => {
      const wrapper = this.container.querySelector(`[data-editor="${type}"]`);
      const savedCode = this.storage.get(type, this.defaults[type]);

      const state = EditorState.create({
        doc: savedCode,
        extensions: [
          lineNumbers(),
          EditorView.lineWrapping,
          highlightActiveLine(),
          highlightActiveLineGutter(),
          history(),
          bracketMatching(),
          indentOnInput(),
          syntaxHighlighting(defaultHighlightStyle),
          oneDark,
          languages[type],
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab
          ]),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              this._onCodeChange(type, update.state.doc.toString());
            }
          })
        ]
      });

      this.editorViews[type] = new EditorView({
        state,
        parent: wrapper
      });
    });
  },

  _switchTab(tab) {
    this.currentTab = tab;

    // Update tab buttons
    this.container.querySelectorAll('.codeeditor-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    // Show/hide editor wrappers
    this.container.querySelectorAll('.codeeditor-editor-wrapper').forEach(w => {
      w.classList.toggle('codeeditor-hidden', w.dataset.editor !== tab);
    });

    // Focus the editor
    this.editorViews[tab]?.focus();
  },

  _onCodeChange(type, code) {
    this.storage.set(type, code);

    // Debounced auto-run
    if (this._autoRunTimeout) {
      clearTimeout(this._autoRunTimeout);
    }
    this._autoRunTimeout = setTimeout(() => {
      this._runCode();
    }, 1000);

    // Debounced auto-save for existing pages
    if (this._currentPageId) {
      if (this._autoSaveTimeout) {
        clearTimeout(this._autoSaveTimeout);
      }
      this._autoSaveTimeout = setTimeout(() => {
        this._autoSaveCurrentPage();
      }, 2000);
    }
  },

  _autoSaveCurrentPage() {
    if (!this._currentPageId) return;

    const pages = this._getPages();
    const idx = pages.findIndex(p => p.id === this._currentPageId);
    if (idx === -1) return;

    const htmlCode = this.editorViews.html?.state.doc.toString() || '';
    const cssCode = this.editorViews.css?.state.doc.toString() || '';
    const jsCode = this.editorViews.js?.state.doc.toString() || '';

    pages[idx].html = htmlCode;
    pages[idx].css = cssCode;
    pages[idx].js = jsCode;
    pages[idx].updatedAt = Date.now();

    this._savePages(pages);
  },

  _runCode() {
    const htmlCode = this.editorViews.html?.state.doc.toString() || '';
    const cssCode = this.editorViews.css?.state.doc.toString() || '';
    const jsCode = this.editorViews.js?.state.doc.toString() || '';

    // Clear console on each run
    this._clearConsole();

    // Console interceptor script to inject into iframe
    const consoleInterceptor = `<script>
(function() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    clear: console.clear
  };

  function sendToParent(type, args) {
    const serialized = Array.from(args).map(arg => {
      try {
        if (arg instanceof Error) {
          return arg.message + (arg.stack ? '\\n' + arg.stack : '');
        }
        if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      } catch (e) {
        return String(arg);
      }
    });
    parent.postMessage({ type: 'console', method: type, args: serialized }, '*');
  }

  console.log = function(...args) { sendToParent('log', args); originalConsole.log.apply(console, args); };
  console.error = function(...args) { sendToParent('error', args); originalConsole.error.apply(console, args); };
  console.warn = function(...args) { sendToParent('warn', args); originalConsole.warn.apply(console, args); };
  console.info = function(...args) { sendToParent('info', args); originalConsole.info.apply(console, args); };
  console.clear = function() { sendToParent('clear', []); originalConsole.clear.apply(console); };

  window.onerror = function(msg, url, line, col, error) {
    sendToParent('error', [msg + ' (line ' + line + ')']);
    return false;
  };
})();
<\/script>`;

    // Inject CSS and JS into HTML
    let finalHtml = htmlCode;

    // Add console interceptor at the very beginning
    if (finalHtml.includes('<head>')) {
      finalHtml = finalHtml.replace('<head>', `<head>\n${consoleInterceptor}`);
    } else if (finalHtml.includes('<html>')) {
      finalHtml = finalHtml.replace('<html>', `<html>\n<head>${consoleInterceptor}</head>`);
    } else {
      finalHtml = consoleInterceptor + '\n' + finalHtml;
    }

    // Add CSS before </head> or at the start
    if (cssCode.trim()) {
      const styleTag = `<style>\n${cssCode}\n</style>`;
      if (finalHtml.includes('</head>')) {
        finalHtml = finalHtml.replace('</head>', `${styleTag}\n</head>`);
      } else if (finalHtml.includes('<body')) {
        finalHtml = finalHtml.replace(/<body/i, `${styleTag}\n<body`);
      } else {
        finalHtml = styleTag + '\n' + finalHtml;
      }
    }

    // Add JS before </body> or at the end
    if (jsCode.trim()) {
      const scriptTag = `<script>\n${jsCode}\n<\/script>`;
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        finalHtml = finalHtml + '\n' + scriptTag;
      }
    }

    const iframe = this.container.querySelector('.codeeditor-preview-frame');
    iframe.srcdoc = finalHtml;
  },

  _resetCode() {
    this._currentPageId = null;
    ['html', 'css', 'js'].forEach(type => {
      const view = this.editorViews[type];
      if (view) {
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: this.defaults[type]
          }
        });
      }
      this.storage.set(type, this.defaults[type]);
    });
    this._runCode();
  },

  _initDividerDrag() {
    const divider = this.container.querySelector('.codeeditor-divider');
    const main = this.container.querySelector('.codeeditor-main');
    const editorPane = this.container.querySelector('.codeeditor-editor-pane');
    const previewPane = this.container.querySelector('.codeeditor-preview-pane');

    let isDragging = false;

    divider.addEventListener('mousedown', (e) => {
      isDragging = true;
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const rect = main.getBoundingClientRect();
      const offset = e.clientX - rect.left;
      const totalWidth = rect.width;
      const percentage = (offset / totalWidth) * 100;

      if (percentage > 20 && percentage < 80) {
        editorPane.style.flex = `0 0 ${percentage}%`;
        previewPane.style.flex = `0 0 ${100 - percentage}%`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
      }
    });
  },

  _generateSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  },

  _getPages() {
    return Storage.get('pages', 'list', []);
  },

  _savePages(pages) {
    Storage.set('pages', 'list', pages);
    window.dispatchEvent(new CustomEvent('pages-changed'));
  },

  _savePage(name) {
    const pages = this._getPages();
    const now = Date.now();
    const htmlCode = this.editorViews.html?.state.doc.toString() || '';
    const cssCode = this.editorViews.css?.state.doc.toString() || '';
    const jsCode = this.editorViews.js?.state.doc.toString() || '';

    if (this._currentPageId) {
      // Update existing page
      const idx = pages.findIndex(p => p.id === this._currentPageId);
      if (idx !== -1) {
        pages[idx].name = name;
        pages[idx].slug = this._generateSlug(name);
        pages[idx].html = htmlCode;
        pages[idx].css = cssCode;
        pages[idx].js = jsCode;
        pages[idx].updatedAt = now;
      }
    } else {
      // Create new page
      const slug = this._generateSlug(name);
      const page = {
        id: `${slug}-${now}`,
        slug,
        name,
        html: htmlCode,
        css: cssCode,
        js: jsCode,
        createdAt: now,
        updatedAt: now
      };
      pages.push(page);
      this._currentPageId = page.id;
    }

    this._savePages(pages);
  },

  _loadPage(pageId) {
    if (!pageId) return;

    const pages = this._getPages();
    const page = pages.find(p => p.id === pageId);
    if (!page) {
      console.warn('Page not found:', pageId);
      return;
    }

    this._currentPageId = page.id;

    ['html', 'css', 'js'].forEach(type => {
      const view = this.editorViews[type];
      const content = page[type] || '';
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: content }
        });
      }
      this.storage.set(type, content);
    });

    this._hidePagesPanel();
    this._runCode();
  },

  _deletePage(pageId) {
    let pages = this._getPages();
    pages = pages.filter(p => p.id !== pageId);
    this._savePages(pages);

    if (this._currentPageId === pageId) {
      this._currentPageId = null;
    }

    this._renderPagesPanel();
  },

  _showSaveDialog() {
    const dialog = this.container.querySelector('.codeeditor-save-dialog');
    const input = this.container.querySelector('.codeeditor-save-input');
    dialog.classList.remove('codeeditor-hidden');

    // Pre-fill with current page name if editing
    if (this._currentPageId) {
      const pages = this._getPages();
      const page = pages.find(p => p.id === this._currentPageId);
      if (page) input.value = page.name;
    } else {
      input.value = '';
    }

    setTimeout(() => input.focus(), 50);
  },

  _hideSaveDialog() {
    this.container.querySelector('.codeeditor-save-dialog').classList.add('codeeditor-hidden');
  },

  _showPagesPanel() {
    const panel = this.container.querySelector('.codeeditor-pages-panel');
    panel.classList.remove('codeeditor-hidden');
    this._renderPagesPanel();
  },

  _hidePagesPanel() {
    this.container.querySelector('.codeeditor-pages-panel').classList.add('codeeditor-hidden');
  },

  _renderPagesPanel() {
    const list = this.container.querySelector('.codeeditor-pages-list');
    const pages = this._getPages();

    if (pages.length === 0) {
      list.innerHTML = '<div class="codeeditor-pages-empty">No saved pages yet.</div>';
      return;
    }

    list.innerHTML = pages.map(page => `
      <div class="codeeditor-pages-item${page.id === this._currentPageId ? ' active' : ''}" data-page-id="${page.id}">
        <span class="codeeditor-pages-item-name">${this._escapeHtml(page.name)}</span>
        <div class="codeeditor-pages-item-actions">
          <button class="codeeditor-pages-load" data-load="${page.id}" title="Load">Open</button>
          <button class="codeeditor-pages-delete" data-delete="${page.id}" title="Delete">&times;</button>
        </div>
      </div>
    `).join('');

    // Use event delegation on the list container
    list.onclick = (e) => {
      const loadBtn = e.target.closest('.codeeditor-pages-load');
      if (loadBtn) {
        e.preventDefault();
        e.stopPropagation();
        const pageId = loadBtn.dataset.load;
        if (pageId) {
          this._loadPage(pageId);
        }
        return;
      }

      const deleteBtn = e.target.closest('.codeeditor-pages-delete');
      if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation();
        const pageId = deleteBtn.dataset.delete;
        if (pageId && confirm('Delete this page?')) {
          this._deletePage(pageId);
        }
        return;
      }
    };
  },

  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  render() {},

  destroy() {
    if (this._autoRunTimeout) {
      clearTimeout(this._autoRunTimeout);
    }
    if (this._autoSaveTimeout) {
      clearTimeout(this._autoSaveTimeout);
    }
    // Clean up message listener
    if (this._messageListener) {
      window.removeEventListener('message', this._messageListener);
      this._messageListener = null;
    }
    // Clean up editor views
    Object.values(this.editorViews).forEach(view => view?.destroy());
    this.editorViews = {};
  },

  // Console methods
  _setupConsoleListener() {
    this._messageListener = (event) => {
      if (event.data && event.data.type === 'console') {
        if (event.data.method === 'clear') {
          this._clearConsole();
        } else {
          this._addConsoleMessage(event.data.method, event.data.args);
        }
      }
    };
    window.addEventListener('message', this._messageListener);
  },

  _addConsoleMessage(method, args) {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    this._consoleMessages.push({ method, args, timestamp });
    this._renderConsoleMessage(method, args, timestamp);

    // Auto-scroll to bottom
    const output = this.container.querySelector('.codeeditor-console-output');
    if (output) {
      output.scrollTop = output.scrollHeight;
    }
  },

  _renderConsoleMessage(method, args, timestamp) {
    const output = this.container.querySelector('.codeeditor-console-output');
    if (!output) return;

    const entry = document.createElement('div');
    entry.className = `codeeditor-console-entry codeeditor-console-${method}`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'codeeditor-console-time';
    timeSpan.textContent = timestamp;

    const msgSpan = document.createElement('span');
    msgSpan.className = 'codeeditor-console-msg';
    msgSpan.textContent = args.join(' ');

    entry.appendChild(timeSpan);
    entry.appendChild(msgSpan);
    output.appendChild(entry);
  },

  _clearConsole() {
    this._consoleMessages = [];
    const output = this.container.querySelector('.codeeditor-console-output');
    if (output) {
      output.innerHTML = '';
    }
  },

  _toggleConsole() {
    const console = this.container.querySelector('.codeeditor-console');
    const btn = this.container.querySelector('.codeeditor-console-toggle');
    if (console) {
      const isVisible = !console.classList.contains('codeeditor-hidden');
      console.classList.toggle('codeeditor-hidden', isVisible);
      btn.classList.toggle('active', !isVisible);
    }
  }
};

export default CodeEditorModule;
