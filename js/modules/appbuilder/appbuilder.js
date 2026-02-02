/**
 * App Builder Module - Create apps using natural language and Claude API
 */
import Storage from '../../core/storage.js';
import ModuleRegistry from '../../core/module-registry.js';

const SYSTEM_PROMPT = `You are a friendly app builder for DumbOS. Create simple, self-contained web apps.

RESPONSE STYLE:
- Start with a warm 1-2 sentence summary of what you built or changed
- Use simple everyday language (no jargon like "function", "event listener", "DOM", "variable")
- Explain WHAT the app does, not HOW the code works
- Good examples: "I've made you a...", "Done! Your app now...", "Here's a little..."
- Keep apps simple - aim for under 100 lines total when possible

CONSTRAINTS:
- Generate HTML, CSS, and JavaScript only
- No external API calls (no fetch, no XMLHttpRequest)
- No external dependencies (no CDN imports)
- Apps run in sandboxed iframe
- Use vanilla JavaScript (ES6+)

OUTPUT FORMAT:
Friendly description first, then code blocks (which are hidden from the user):

\`\`\`html
<!-- HTML here -->
\`\`\`

\`\`\`css
/* CSS here */
\`\`\`

\`\`\`js
// JavaScript here
\`\`\`

DUMBOS DESIGN SYSTEM (use these exact values):

Colors:
- Background primary: #1a1a1a
- Background secondary: #242424
- Background tertiary: #2e2e2e
- Text primary: #e8e8e8
- Text secondary: #a0a0a0
- Text muted: #666666
- Accent (buttons, highlights): #e94560
- Accent hover: #ff6b6b
- Borders: #333333

Typography:
- Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- Base size: 14px
- Small: 12px

Spacing: 4px, 8px, 16px, 24px increments

UI Patterns:
- Buttons: background #2e2e2e, border 1px solid #333, border-radius 4-6px, hover uses accent color
- Inputs: background #2e2e2e, border 1px solid #333, border-radius 4px, focus border #e94560
- Cards/panels: background #242424, border 1px solid #333, border-radius 8px
- Subtle shadows: 0 2px 8px rgba(0,0,0,0.3)
- Transitions: 0.1s ease for hover states

Style notes:
- Minimal, clean interfaces
- Generous padding (16px typical)
- Low contrast borders (subtle separation)
- Interactive elements have clear hover/active states using the accent color

CRITICAL - CODE COMPLETENESS:
- Every button, link, and interactive element in the HTML MUST have working JavaScript
- Never create UI elements without implementing their functionality
- If you add an "Export" button, implement the full export logic
- If you add a modal, implement open/close/action handlers
- Test mentally: "If a user clicks this, what happens?" - if nothing, you forgot to implement it
- Common patterns to always implement fully:
  - Export/Download: canvas.toDataURL() → create link → trigger download
  - Modals: show/hide logic, close button, overlay click to close
  - Forms: validation, submission handling, success/error states

For refinements, only include code blocks that changed.`;

const DEFAULT_APP_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>`;

const AppBuilderModule = {
  id: 'appbuilder',
  title: 'App Builder',
  category: 'tools',
  description: 'Create apps using natural language',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3z"/><path d="M12 12l9-4.5"/><path d="M12 12v9"/><path d="M12 12L3 7.5"/></svg>`,
  defaultSize: { width: 1000, height: 600 },
  minSize: { width: 800, height: 500 },

  container: null,
  storage: null,
  apps: [],
  selectedAppId: null,
  conversation: [],
  currentCode: { html: '', css: '', js: '' },
  isLoading: false,

  init(container, storage) {
    this.container = container;
    this.storage = storage;
    this._loadApps();
    this._buildUI();
  },

  _loadApps() {
    this.apps = this.storage.get('apps', []);
  },

  _saveApps() {
    this.storage.set('apps', this.apps);
  },

  _buildUI() {
    this.container.innerHTML = `
      <div class="appbuilder-layout">
        <aside class="appbuilder-sidebar">
          <div class="appbuilder-sidebar-header">
            <span>My Apps</span>
            <button class="appbuilder-new-btn" title="New App">+</button>
          </div>
          <ul class="appbuilder-apps-list"></ul>
          <div class="appbuilder-sidebar-footer">
            <button class="appbuilder-import-btn">Import</button>
            <input type="file" class="appbuilder-import-input" accept=".dumbapp.json" style="display:none">
          </div>
        </aside>
        <main class="appbuilder-main">
          <div class="appbuilder-api-setup" style="display:none">
            <div class="appbuilder-api-setup-content">
              <h2>API Key Required</h2>
              <p class="appbuilder-api-intro">App Builder uses Claude to generate apps from your descriptions. Configure your Anthropic API key in Settings to get started.</p>
              <button class="appbuilder-open-settings-btn">Open Settings</button>
            </div>
          </div>
          <div class="appbuilder-workspace" style="display:none">
            <div class="appbuilder-chat-pane">
              <div class="appbuilder-chat-messages"></div>
              <div class="appbuilder-chat-input-area">
                <textarea class="appbuilder-chat-input" placeholder="Describe the app you want to create..." rows="3"></textarea>
                <button class="appbuilder-send-btn" title="Send">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                </button>
              </div>
            </div>
            <div class="appbuilder-preview-pane">
              <div class="appbuilder-preview-header">
                <span>Preview</span>
                <div class="appbuilder-complexity-meter">
                  <div class="appbuilder-complexity-bar">
                    <div class="appbuilder-complexity-fill"></div>
                  </div>
                  <span class="appbuilder-complexity-count">0</span>
                </div>
                <div class="appbuilder-preview-actions">
                  <button class="appbuilder-save-app-btn" disabled>Save as App</button>
                  <button class="appbuilder-export-btn" style="display:none">Export</button>
                </div>
              </div>
              <iframe class="appbuilder-preview-frame" sandbox="allow-scripts allow-same-origin allow-downloads allow-modals allow-forms"></iframe>
            </div>
          </div>
        </main>
      </div>
      <div class="appbuilder-save-dialog" style="display:none">
        <div class="appbuilder-save-dialog-content">
          <h3>Save App</h3>
          <input type="text" class="appbuilder-save-name-input" placeholder="App name">
          <textarea class="appbuilder-save-desc-input" placeholder="Description (optional)" rows="2"></textarea>
          <div class="appbuilder-save-dialog-actions">
            <button class="appbuilder-save-confirm-btn">Save</button>
            <button class="appbuilder-save-cancel-btn">Cancel</button>
          </div>
        </div>
      </div>
    `;

    this._setupEventListeners();
    this._checkApiKey();
  },

  _setupEventListeners() {
    // New app button
    this.container.querySelector('.appbuilder-new-btn').addEventListener('click', () => {
      this._newApp();
    });

    // Import button
    this.container.querySelector('.appbuilder-import-btn').addEventListener('click', () => {
      this.container.querySelector('.appbuilder-import-input').click();
    });

    this.container.querySelector('.appbuilder-import-input').addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this._importApp(e.target.files[0]);
        e.target.value = '';
      }
    });

    // Open Settings button
    this.container.querySelector('.appbuilder-open-settings-btn').addEventListener('click', () => {
      window.DumbOS.openModule('settings');
    });

    // Listen for API key changes from Settings
    this._onSettingsChanged = (e) => {
      if (e.detail.key === 'api-key') {
        this._checkApiKey();
      }
    };
    window.addEventListener('settings-changed', this._onSettingsChanged);

    // Chat input
    const chatInput = this.container.querySelector('.appbuilder-chat-input');
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._sendMessage();
      }
    });

    this.container.querySelector('.appbuilder-send-btn').addEventListener('click', () => {
      this._sendMessage();
    });

    // Save app button
    this.container.querySelector('.appbuilder-save-app-btn').addEventListener('click', () => {
      this._showSaveDialog();
    });

    // Export button
    this.container.querySelector('.appbuilder-export-btn').addEventListener('click', () => {
      if (this.selectedAppId) {
        this._exportApp(this.selectedAppId);
      }
    });

    // Save dialog
    this.container.querySelector('.appbuilder-save-confirm-btn').addEventListener('click', () => {
      this._confirmSaveApp();
    });

    this.container.querySelector('.appbuilder-save-cancel-btn').addEventListener('click', () => {
      this._hideSaveDialog();
    });

    this.container.querySelector('.appbuilder-save-name-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._confirmSaveApp();
      if (e.key === 'Escape') this._hideSaveDialog();
    });
  },

  _checkApiKey() {
    const apiKey = Storage.get('claude-api', 'apiKey', null);
    const apiSetup = this.container.querySelector('.appbuilder-api-setup');
    const workspace = this.container.querySelector('.appbuilder-workspace');

    if (!apiKey) {
      apiSetup.style.display = 'flex';
      workspace.style.display = 'none';
      return false;
    }

    apiSetup.style.display = 'none';
    workspace.style.display = 'flex';
    return true;
  },

  _newApp() {
    this.selectedAppId = null;
    this.conversation = [];
    this.currentCode = { html: '', css: '', js: '' };

    this._renderAppsList();
    this._renderChat();
    this._updatePreview();
    this._updateComplexityMeter();

    this.container.querySelector('.appbuilder-save-app-btn').disabled = true;
    this.container.querySelector('.appbuilder-export-btn').style.display = 'none';
    this.container.querySelector('.appbuilder-chat-input').focus();
  },

  _selectApp(appId) {
    const app = this.apps.find(a => a.id === appId);
    if (!app) return;

    this.selectedAppId = appId;
    this.conversation = [...app.conversation];
    this.currentCode = { ...app.code };

    this._renderAppsList();
    this._renderChat();
    this._updatePreview();
    this._updateComplexityMeter();

    this.container.querySelector('.appbuilder-save-app-btn').disabled = false;
    this.container.querySelector('.appbuilder-export-btn').style.display = 'inline-block';
  },

  _deleteApp(appId) {
    if (!confirm('Delete this app? This cannot be undone.')) return;

    const moduleId = `custom-${appId}`;
    ModuleRegistry.unregister(moduleId);
    window.dispatchEvent(new CustomEvent('module-unregistered', { detail: { moduleId } }));

    this.apps = this.apps.filter(a => a.id !== appId);
    this._saveApps();

    if (this.selectedAppId === appId) {
      this._newApp();
    } else {
      this._renderAppsList();
    }
  },

  _renderAppsList() {
    const listEl = this.container.querySelector('.appbuilder-apps-list');
    listEl.innerHTML = '';

    this.apps.forEach(app => {
      const li = document.createElement('li');
      li.className = 'appbuilder-app-item';
      if (this.selectedAppId === app.id) {
        li.classList.add('active');
      }

      li.innerHTML = `
        <div class="appbuilder-app-item-content">
          <span class="appbuilder-app-item-name">${this._escapeHtml(app.name)}</span>
        </div>
        <button class="appbuilder-app-delete-btn" title="Delete">&times;</button>
      `;

      li.querySelector('.appbuilder-app-item-content').addEventListener('click', () => {
        this._selectApp(app.id);
      });

      li.querySelector('.appbuilder-app-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this._deleteApp(app.id);
      });

      listEl.appendChild(li);
    });
  },

  _renderChat() {
    const messagesEl = this.container.querySelector('.appbuilder-chat-messages');
    messagesEl.innerHTML = '';

    if (this.conversation.length === 0) {
      messagesEl.innerHTML = `
        <div class="appbuilder-chat-welcome">
          <h3>Create an App</h3>
          <p>Describe what you want to build and I'll generate the code.</p>
          <div class="appbuilder-chat-examples">
            <button class="appbuilder-example-btn">A simple timer app</button>
            <button class="appbuilder-example-btn">A color palette generator</button>
            <button class="appbuilder-example-btn">A todo list with categories</button>
          </div>
        </div>
      `;

      messagesEl.querySelectorAll('.appbuilder-example-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.container.querySelector('.appbuilder-chat-input').value = btn.textContent;
          this._sendMessage();
        });
      });
      return;
    }

    this.conversation.forEach(msg => {
      const msgEl = document.createElement('div');
      msgEl.className = `appbuilder-chat-message appbuilder-chat-${msg.role}`;

      if (msg.role === 'user') {
        msgEl.innerHTML = `<div class="appbuilder-message-content">${this._escapeHtml(msg.content)}</div>`;
      } else {
        // For assistant messages, show description but hide code blocks
        const description = this._extractDescription(msg.content);
        let costHtml = '';
        if (msg.usage && msg.usage.cost !== undefined) {
          costHtml = `<div class="appbuilder-message-cost">${this._formatCost(msg.usage.cost)}</div>`;
        }
        msgEl.innerHTML = `<div class="appbuilder-message-content">${this._escapeHtml(description)}</div>${costHtml}`;
      }

      messagesEl.appendChild(msgEl);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  },

  _extractDescription(content) {
    // Remove code blocks and return just the description
    return content
      .replace(/```html[\s\S]*?```/g, '')
      .replace(/```css[\s\S]*?```/g, '')
      .replace(/```(?:js|javascript)[\s\S]*?```/g, '')
      .trim() || 'Code generated successfully.';
  },

  _calculateCost(inputTokens, outputTokens) {
    // Claude Sonnet pricing (per million tokens)
    const INPUT_COST_PER_M = 3.00;
    const OUTPUT_COST_PER_M = 15.00;

    const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_M;
    const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_M;

    return inputCost + outputCost;
  },

  _formatCost(cost) {
    if (cost < 0.01) {
      return `$${cost.toFixed(4)}`;
    }
    return `$${cost.toFixed(3)}`;
  },

  async _sendMessage() {
    if (this.isLoading) return;

    const input = this.container.querySelector('.appbuilder-chat-input');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';

    // Add user message to conversation
    this.conversation.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    this._renderChat();
    this._setLoading(true);

    try {
      const response = await this._callClaudeAPI();

      if (response.error) {
        throw new Error(response.error.message || 'API request failed');
      }

      const assistantContent = response.content[0].text;

      // Calculate cost from usage (Claude Sonnet pricing)
      const usage = response.usage || {};
      const cost = this._calculateCost(usage.input_tokens || 0, usage.output_tokens || 0);

      // Parse code blocks and merge with current code
      const newCode = this._parseCodeBlocks(assistantContent);
      if (newCode.html) this.currentCode.html = newCode.html;
      if (newCode.css) this.currentCode.css = newCode.css;
      if (newCode.js) this.currentCode.js = newCode.js;

      // Add assistant message
      this.conversation.push({
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now(),
        code: { ...this.currentCode },
        usage: { ...usage, cost }
      });

      this._renderChat();
      this._updatePreview();
      this._updateComplexityMeter();

      // Enable save button if we have code
      if (this.currentCode.html || this.currentCode.css || this.currentCode.js) {
        this.container.querySelector('.appbuilder-save-app-btn').disabled = false;
      }

    } catch (error) {
      console.error('API error:', error);
      this._showError(error.message);
      // Remove the user message if API failed
      this.conversation.pop();
      this._renderChat();
    } finally {
      this._setLoading(false);
    }
  },

  async _callClaudeAPI() {
    const apiKey = Storage.get('claude-api', 'apiKey');

    const messages = this.conversation.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

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
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: messages
      })
    });

    return await response.json();
  },

  _parseCodeBlocks(responseText) {
    const code = { html: '', css: '', js: '' };

    const htmlMatch = responseText.match(/```html\n([\s\S]*?)```/);
    if (htmlMatch) code.html = htmlMatch[1].trim();

    const cssMatch = responseText.match(/```css\n([\s\S]*?)```/);
    if (cssMatch) code.css = cssMatch[1].trim();

    const jsMatch = responseText.match(/```(?:js|javascript)\n([\s\S]*?)```/);
    if (jsMatch) code.js = jsMatch[1].trim();

    return code;
  },

  _updatePreview() {
    const iframe = this.container.querySelector('.appbuilder-preview-frame');

    if (!this.currentCode.html && !this.currentCode.css && !this.currentCode.js) {
      iframe.srcdoc = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: system-ui, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #1a1a2e;
              color: #888;
            }
          </style>
        </head>
        <body>
          <p>Preview will appear here</p>
        </body>
        </html>
      `;
      return;
    }

    let html = this.currentCode.html || '<!DOCTYPE html><html><head></head><body></body></html>';

    if (this.currentCode.css) {
      html = html.replace('</head>', `<style>${this.currentCode.css}</style></head>`);
    }
    if (this.currentCode.js) {
      html = html.replace('</body>', `<script>${this.currentCode.js}<\/script></body>`);
    }

    iframe.srcdoc = html;
  },

  _getLineCount() {
    const html = this.currentCode.html || '';
    const css = this.currentCode.css || '';
    const js = this.currentCode.js || '';
    return (html + '\n' + css + '\n' + js).split('\n').length;
  },

  _updateComplexityMeter() {
    const lines = this._getLineCount();
    const meter = this.container.querySelector('.appbuilder-complexity-meter');
    const fill = this.container.querySelector('.appbuilder-complexity-fill');
    const count = this.container.querySelector('.appbuilder-complexity-count');

    if (!meter || !fill || !count) return;

    count.textContent = lines;

    // Calculate fill percentage (max out at 1000 lines for visual)
    const maxLines = 1000;
    const percentage = Math.min((lines / maxLines) * 100, 100);
    fill.style.width = `${percentage}%`;

    // Set color based on thresholds
    meter.classList.remove('simple', 'moderate', 'complex');
    if (lines <= 300) {
      meter.classList.add('simple');
    } else if (lines <= 600) {
      meter.classList.add('moderate');
    } else {
      meter.classList.add('complex');
    }
  },

  _setLoading(loading) {
    this.isLoading = loading;
    const sendBtn = this.container.querySelector('.appbuilder-send-btn');
    const input = this.container.querySelector('.appbuilder-chat-input');

    sendBtn.disabled = loading;
    input.disabled = loading;

    if (loading) {
      sendBtn.classList.add('loading');
      // Add loading message
      const messagesEl = this.container.querySelector('.appbuilder-chat-messages');
      const loadingEl = document.createElement('div');
      loadingEl.className = 'appbuilder-chat-message appbuilder-chat-loading';
      loadingEl.innerHTML = '<div class="appbuilder-loading-dots"><span></span><span></span><span></span></div>';
      messagesEl.appendChild(loadingEl);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } else {
      sendBtn.classList.remove('loading');
      const loadingEl = this.container.querySelector('.appbuilder-chat-loading');
      if (loadingEl) loadingEl.remove();
    }
  },

  _showError(message) {
    const messagesEl = this.container.querySelector('.appbuilder-chat-messages');
    const errorEl = document.createElement('div');
    errorEl.className = 'appbuilder-chat-error';
    errorEl.textContent = `Error: ${message}`;
    messagesEl.appendChild(errorEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    setTimeout(() => errorEl.remove(), 5000);
  },

  _showSaveDialog() {
    const dialog = this.container.querySelector('.appbuilder-save-dialog');
    const nameInput = this.container.querySelector('.appbuilder-save-name-input');
    const descInput = this.container.querySelector('.appbuilder-save-desc-input');

    if (this.selectedAppId) {
      const app = this.apps.find(a => a.id === this.selectedAppId);
      if (app) {
        nameInput.value = app.name;
        descInput.value = app.description || '';
      }
    } else {
      nameInput.value = '';
      descInput.value = '';
    }

    dialog.style.display = 'flex';
    setTimeout(() => nameInput.focus(), 50);
  },

  _hideSaveDialog() {
    this.container.querySelector('.appbuilder-save-dialog').style.display = 'none';
  },

  _confirmSaveApp() {
    const nameInput = this.container.querySelector('.appbuilder-save-name-input');
    const descInput = this.container.querySelector('.appbuilder-save-desc-input');
    const name = nameInput.value.trim();

    if (!name) {
      nameInput.focus();
      return;
    }

    const description = descInput.value.trim();
    const now = Date.now();

    if (this.selectedAppId) {
      // Update existing app
      const app = this.apps.find(a => a.id === this.selectedAppId);
      if (app) {
        app.name = name;
        app.description = description;
        app.code = { ...this.currentCode };
        app.conversation = [...this.conversation];
        app.updatedAt = now;
      }
    } else {
      // Create new app
      const id = this._generateId();
      const app = {
        id,
        name,
        description,
        icon: DEFAULT_APP_ICON,
        code: { ...this.currentCode },
        conversation: [...this.conversation],
        createdAt: now,
        updatedAt: now
      };
      this.apps.push(app);
      this.selectedAppId = id;
    }

    this._saveApps();
    this._registerApp(this.apps.find(a => a.id === this.selectedAppId));
    this._renderAppsList();
    this._hideSaveDialog();

    this.container.querySelector('.appbuilder-export-btn').style.display = 'inline-block';
  },

  _registerApp(app) {
    const moduleId = `custom-${app.id}`;

    // Unregister if already exists
    if (ModuleRegistry.has(moduleId)) {
      ModuleRegistry.unregister(moduleId);
    }

    const module = {
      id: moduleId,
      title: app.name,
      category: 'custom',
      icon: app.icon || DEFAULT_APP_ICON,
      defaultSize: { width: 500, height: 400 },
      minSize: { width: 300, height: 200 },
      _appCode: { ...app.code },

      init(container) {
        const iframe = document.createElement('iframe');
        iframe.sandbox = 'allow-scripts allow-same-origin allow-downloads allow-modals allow-forms';
        iframe.style.cssText = 'width:100%;height:100%;border:none;';

        let html = this._appCode.html || '<!DOCTYPE html><html><head></head><body></body></html>';
        if (this._appCode.css) {
          html = html.replace('</head>', `<style>${this._appCode.css}</style></head>`);
        }
        if (this._appCode.js) {
          html = html.replace('</body>', `<script>${this._appCode.js}<\/script></body>`);
        }

        iframe.srcdoc = html;
        container.appendChild(iframe);
      },
      render() {},
      destroy() {}
    };

    ModuleRegistry.register(module);
    window.dispatchEvent(new CustomEvent('module-registered', { detail: { moduleId } }));
  },

  _exportApp(appId) {
    const app = this.apps.find(a => a.id === appId);
    if (!app) return;

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: {
        name: app.name,
        description: app.description,
        icon: app.icon,
        code: app.code,
        conversation: app.conversation
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${app.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.dumbapp.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async _importApp(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || !data.app || !data.app.name || !data.app.code) {
        throw new Error('Invalid app file format');
      }

      const id = this._generateId();
      const now = Date.now();
      const app = {
        id,
        name: data.app.name,
        description: data.app.description || '',
        icon: data.app.icon || DEFAULT_APP_ICON,
        code: data.app.code,
        conversation: data.app.conversation || [],
        createdAt: now,
        updatedAt: now
      };

      this.apps.push(app);
      this._saveApps();
      this._registerApp(app);
      this._renderAppsList();
      this._selectApp(id);

    } catch (error) {
      alert('Failed to import app: ' + error.message);
    }
  },

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
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

  render() {
    if (this._checkApiKey()) {
      this._renderAppsList();

      // Register all saved apps on render
      this.apps.forEach(app => this._registerApp(app));
    }
  },

  destroy() {
    if (this._onSettingsChanged) {
      window.removeEventListener('settings-changed', this._onSettingsChanged);
    }
  }
};

// Function to register custom apps on startup (called from app.js)
export function registerCustomApps() {
  const apps = Storage.get('appbuilder', 'apps', []);

  apps.forEach(app => {
    const moduleId = `custom-${app.id}`;
    if (ModuleRegistry.has(moduleId)) return;

    const module = {
      id: moduleId,
      title: app.name,
      category: 'custom',
      icon: app.icon || DEFAULT_APP_ICON,
      defaultSize: { width: 500, height: 400 },
      minSize: { width: 300, height: 200 },
      _appCode: { ...app.code },

      init(container) {
        const iframe = document.createElement('iframe');
        iframe.sandbox = 'allow-scripts allow-same-origin allow-downloads allow-modals allow-forms';
        iframe.style.cssText = 'width:100%;height:100%;border:none;';

        let html = this._appCode.html || '<!DOCTYPE html><html><head></head><body></body></html>';
        if (this._appCode.css) {
          html = html.replace('</head>', `<style>${this._appCode.css}</style></head>`);
        }
        if (this._appCode.js) {
          html = html.replace('</body>', `<script>${this._appCode.js}<\/script></body>`);
        }

        iframe.srcdoc = html;
        container.appendChild(iframe);
      },
      render() {},
      destroy() {}
    };

    ModuleRegistry.register(module);
  });
}

export default AppBuilderModule;
