# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DumbOS is a privacy-first, modular web-based desktop environment. Built with vanilla JS/HTML/CSS (no build step, no frameworks). All data persists in localStorage.

## Running the Project

```bash
npx serve
```
Opens at `http://localhost:3000`

## Deployment

Hosted on Cloudflare Pages at os.dumbsoft.com. Always deploy to production:
```bash
wrangler pages deploy . --project-name=dumbos --branch=production
```

## Architecture

### Core Systems (`js/core/`)

- **app.js** - Bootstrap, module registration, window restoration. Exposes `window.DumbOS.openModule(id)` and `window.DumbOS.getModules()` globally.
- **window-manager.js** - Singleton managing window lifecycle: create, drag, resize, minimize, maximize, close. Persists window state to localStorage.
- **module-registry.js** - Singleton Map storing registered modules by ID.
- **storage.js** - Namespaced localStorage wrapper. Modules receive a scoped interface via `Storage.module(moduleId)`.
- **taskbar.js** - Renders module icons, handles open/minimize/restore states, displays system clock.
- **start-menu.js** - Application launcher with categorized module listing.
- **context-menu.js** - Right-click context menus. Use `ContextMenu.show(x, y, items)` where items are `[{label, action, disabled, separator}]`.
- **desktop-shortcuts.js** - Desktop icon management with grid positioning. Use `DesktopShortcuts.getNextGridPosition()` for new icons.
- **screensaver.js** - Idle detection and screensaver activation.

### Module Interface

Each module exports an object with:
```javascript
{
  id: 'moduleid',           // Unique identifier
  title: 'Display Name',
  category: 'productivity', // productivity, entertainment, games, tools, system
  icon: '<svg>...</svg>',   // Inline SVG for taskbar
  defaultSize: { width, height },
  minSize: { width, height },

  init(container, storage) {},  // Build UI, receives DOM container and scoped storage
  render() {},                   // Called after init
  destroy() {}                   // Cleanup intervals/listeners
}
```

### Adding a Module

1. Create `js/modules/{name}/{name}.js` and `{name}.css`
2. Import and register in `app.js` `_registerModules()`
3. Add CSS `<link>` to `index.html`

### Storage API

Global access: `Storage.get(namespace, key, default)`, `Storage.set(namespace, key, value)`

Scoped module storage (passed to `init`): `storage.get(key, default)`, `storage.set(key, value)`

Pattern: `dumbos:{namespace}:{key}`

### Claude API Integration

Modules with AI features (Synth, App Builder) use a shared API key stored in Settings:
```javascript
import Storage from '../../core/storage.js';
const apiKey = Storage.get('claude-api', 'apiKey', null);
```

Direct browser access requires the header: `'anthropic-dangerous-direct-browser-access': 'true'`

### Event System

Window events dispatched on `window`:
- `window-opened`, `window-closed`, `window-minimized`, `window-restored` (detail: `{ windowId }`)
- `settings-changed` (detail: `{ key, value }`)
- `desktop-shortcuts-changed`, `taskbar-pins-changed`

### Desktop Icons

Two types: `.desktop-shortcut` (module shortcuts) and `.desktop-bookmark` (bookmark links). Grid constants: 90px horizontal, 100px vertical spacing, starting at (20, 20).

### Theming

CSS custom properties in `css/variables.css`. Light theme via `<html data-theme="light">`.

## Cloudflare Worker (Proxy)

Located in `worker/rss-proxy.js`. Handles:
- `?url=` - RSS/Atom feed fetching and parsing
- `?article=` - Article content extraction
- `?stocks=` - Yahoo Finance stock quotes

Deploy with:
```bash
cd worker && wrangler deploy
```

Referenced in `js/modules/rss/rss.js` and `js/modules/stocktracker/stocktracker.js`.
