/**
 * Help Module - App guide and documentation
 */
const HelpModule = {
  id: 'help',
  title: 'Help',
  category: 'system',
  description: 'Guide to all available apps',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  defaultSize: { width: 500, height: 550 },
  minSize: { width: 400, height: 400 },

  container: null,

  init(container) {
    this.container = container;
    this._buildUI();
  },

  _buildUI() {
    const modules = window.DumbOS.getModules();

    const categoryNames = {
      productivity: 'Productivity',
      entertainment: 'Entertainment',
      games: 'Games',
      tools: 'Tools',
      system: 'System'
    };

    const categoryDescriptions = {
      productivity: 'Apps to help you create and organize',
      entertainment: 'Media and content discovery',
      games: 'Fun and relaxation',
      tools: 'Utilities and system features',
      system: 'Configuration and help'
    };

    // Group modules by category
    const categories = {};
    modules.forEach(module => {
      const cat = module.category || 'other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(module);
    });

    // Render in specific order
    const order = ['productivity', 'entertainment', 'games', 'tools', 'system'];

    this.container.innerHTML = `
      <div class="help-container">
        <div class="help-header">
          <h1>DumbOS Help</h1>
          <p>A guide to all available applications</p>
        </div>
        <div class="help-content">
          ${order.filter(cat => categories[cat]?.length > 0).map(cat => `
            <section class="help-category">
              <div class="help-category-header">
                <h2>${categoryNames[cat] || cat}</h2>
                <span>${categoryDescriptions[cat] || ''}</span>
              </div>
              <div class="help-apps">
                ${categories[cat].map(module => `
                  <button class="help-app" data-module="${module.id}">
                    <span class="help-app-icon">${this._renderIcon(module.icon)}</span>
                    <div class="help-app-info">
                      <strong>${module.title}</strong>
                      <span>${module.description || ''}</span>
                    </div>
                  </button>
                `).join('')}
              </div>
            </section>
          `).join('')}
        </div>
      </div>
    `;

    // Add click handlers to open apps
    this.container.querySelectorAll('.help-app').forEach(btn => {
      btn.addEventListener('click', () => {
        const moduleId = btn.dataset.module;
        if (moduleId) {
          window.DumbOS.openModule(moduleId);
        }
      });
    });
  },

  _renderIcon(icon) {
    // If icon is an emoji (short string without <), return as-is
    if (icon && !icon.includes('<')) {
      return `<span class="help-app-emoji">${icon}</span>`;
    }
    return icon || '';
  },

  render() {},

  destroy() {}
};

export default HelpModule;
