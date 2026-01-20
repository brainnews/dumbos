# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DumbOS is a privacy-first, modular web-based desktop environment. Built with vanilla JS/HTML/CSS (no build step, no frameworks). All data persists in localStorage.

## Running the Project

```bash
npx serve
```
Opens at `http://localhost:3000`

## Architecture

### Core Systems (`js/core/`)

- **app.js** - Bootstrap, module registration, window restoration. Exposes `window.DumbOS.openModule(id)` globally.
- **window-manager.js** - Singleton managing window lifecycle: create, drag, resize, minimize, maximize, close. Persists window state to localStorage.
- **module-registry.js** - Singleton Map storing registered modules by ID.
- **storage.js** - Namespaced localStorage wrapper. Modules receive a scoped interface via `Storage.module(moduleId)`.
- **taskbar.js** - Renders module icons, handles open/minimize/restore states, displays system clock.

### Module Interface

Each module exports an object with:
```javascript
{
  id: 'moduleid',           // Unique identifier
  title: 'Display Name',
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

### Current Modules

- **notes** - Textarea with 500ms debounced auto-save
- **rss** - Feed reader using Cloudflare Worker proxy at `worker/rss-proxy.js`
- **pomodoro** - Timer with work/break intervals, browser notifications
- **bookmarks** - Links manager with optional desktop icon display
- **sysinfo** - Browser/hardware info display
- **metmuseum** - Browse and search art from The Metropolitan Museum of Art API
- **settings** - Clock format, background image, data export/import, factory reset

### Event System

Window events dispatched on `window`:
- `window-opened`, `window-closed`, `window-minimized`, `window-restored` (detail: `{ windowId }`)
- `settings-changed` (detail: `{ key, value }`)

### Storage Keys

Pattern: `dumbos:{namespace}:{key}`
- Window state: `dumbos:windows:{moduleId}`
- Module data: `dumbos:{moduleId}:{key}`

### Theming

CSS custom properties in `css/variables.css`. Light theme via `<html data-theme="light">`.

## Deployment

Hosted on Cloudflare Pages at os.dumbsoft.com. Always deploy to production:
```bash
wrangler pages deploy . --project-name=dumbos --branch=production
```

## RSS Proxy (Cloudflare Worker)

Located in `worker/`. Deploy with:
```bash
cd worker && wrangler deploy
```
Update `RSS_PROXY_URL` in `js/modules/rss/rss.js` after deployment.
