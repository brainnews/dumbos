# DumbOS

A privacy-first, modular web-based dashboard. Built with vanilla JS/HTML/CSS featuring draggable windows, localStorage persistence, and a theming system.

## Features

- **Window Management**: Drag, resize, minimize, maximize, and close windows
- **Persistent State**: Window positions and module data saved to localStorage
- **Modular Architecture**: Easy to add new modules
- **Dark Theme**: Clean, modern dark theme with light theme support
- **Privacy-First**: All data stored locally, no tracking

## Modules

- **Clock**: Time and date display
- **Notes**: Simple notepad with auto-save
- **RSS Reader**: Read RSS/Atom feeds via proxy

## Quick Start

1. Serve the files locally:
   ```bash
   npx serve
   ```

2. Open `http://localhost:3000` in your browser

## RSS Proxy Setup

The RSS module requires a Cloudflare Worker proxy to fetch feeds (CORS bypass).

1. Install Wrangler:
   ```bash
   npm install -g wrangler
   ```

2. Deploy the worker:
   ```bash
   cd worker
   wrangler deploy
   ```

3. Update the `RSS_PROXY_URL` in `js/modules/rss/rss.js` with your worker URL

## Adding a New Module

1. Create module files:
   ```
   js/modules/{name}/{name}.js
   js/modules/{name}/{name}.css
   ```

2. Implement the module interface:
   ```javascript
   export default {
     id: 'mymodule',
     title: 'My Module',
     icon: '<svg>...</svg>',
     defaultSize: { width: 400, height: 300 },
     minSize: { width: 200, height: 150 },

     init(container, storage) {
       // Build UI, setup listeners
     },

     render() {
       // Called after init
     },

     destroy() {
       // Cleanup (intervals, listeners)
     }
   };
   ```

3. Register in `js/core/app.js`:
   ```javascript
   import MyModule from '../modules/mymodule/mymodule.js';
   // ...
   ModuleRegistry.register(MyModule);
   ```

4. Add CSS import to `index.html`

## Project Structure

```
dumbos/
├── index.html
├── css/
│   ├── variables.css      # CSS custom properties (theming)
│   ├── main.css           # Reset, base styles
│   ├── window.css         # Window frames, controls
│   └── taskbar.css        # Bottom taskbar
├── js/
│   ├── core/
│   │   ├── app.js         # Bootstrap
│   │   ├── storage.js     # localStorage wrapper
│   │   ├── window-manager.js
│   │   ├── module-registry.js
│   │   └── taskbar.js
│   └── modules/
│       ├── clock/
│       ├── notes/
│       └── rss/
├── assets/icons/
└── worker/
    ├── rss-proxy.js       # Cloudflare Worker
    └── wrangler.toml
```

## Theming

Switch to light theme by adding `data-theme="light"` to `<html>`:

```html
<html lang="en" data-theme="light">
```

Customize colors in `css/variables.css`.

## License

MIT
