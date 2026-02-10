const CACHE_VERSION = 'v1';
const SHELL_CACHE = `dumbos-shell-${CACHE_VERSION}`;
const CDN_CACHE = 'dumbos-cdn-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',

  // Core CSS
  '/css/variables.css',
  '/css/main.css',
  '/css/window.css',
  '/css/taskbar.css',
  '/css/context-menu.css',
  '/css/start-menu.css',
  '/css/desktop-shortcuts.css',
  '/css/screensaver.css',

  // Module CSS
  '/js/modules/notes/notes.css',
  '/js/modules/rss/rss.css',
  '/js/modules/settings/settings.css',
  '/js/modules/pomodoro/pomodoro.css',
  '/js/modules/bookmarks/bookmarks.css',
  '/js/modules/sysinfo/sysinfo.css',
  '/js/modules/metmuseum/metmuseum.css',
  '/js/modules/breakout/breakout.css',
  '/js/modules/snake/snake.css',
  '/js/modules/codeeditor/codeeditor.css',
  '/js/modules/browser/browser.css',
  '/js/modules/youtube/youtube.css',
  '/js/modules/bubblewrap/bubblewrap.css',
  '/js/modules/pixelart/pixelart.css',
  '/js/modules/nonogram/nonogram.css',
  '/js/modules/writing/writing.css',
  '/js/modules/photoeditor/photoeditor.css',
  '/js/modules/help/help.css',
  '/js/modules/synth/synth.css',
  '/js/modules/stocktracker/stocktracker.css',
  '/js/modules/appbuilder/appbuilder.css',
  '/js/modules/storymode/storymode.css',
  '/js/modules/journal/journal.css',

  // Core JS
  '/js/core/app.js',
  '/js/core/window-manager.js',
  '/js/core/module-registry.js',
  '/js/core/storage.js',
  '/js/core/taskbar.js',
  '/js/core/start-menu.js',
  '/js/core/context-menu.js',
  '/js/core/desktop-shortcuts.js',
  '/js/core/screensaver.js',

  // Module JS
  '/js/modules/notes/notes.js',
  '/js/modules/rss/rss.js',
  '/js/modules/settings/settings.js',
  '/js/modules/pomodoro/pomodoro.js',
  '/js/modules/bookmarks/bookmarks.js',
  '/js/modules/sysinfo/sysinfo.js',
  '/js/modules/metmuseum/metmuseum.js',
  '/js/modules/breakout/breakout.js',
  '/js/modules/snake/snake.js',
  '/js/modules/codeeditor/codeeditor.js',
  '/js/modules/browser/browser.js',
  '/js/modules/youtube/youtube.js',
  '/js/modules/bubblewrap/bubblewrap.js',
  '/js/modules/pixelart/pixelart.js',
  '/js/modules/nonogram/nonogram.js',
  '/js/modules/writing/writing.js',
  '/js/modules/photoeditor/photoeditor.js',
  '/js/modules/help/help.js',
  '/js/modules/synth/synth.js',
  '/js/modules/stocktracker/stocktracker.js',
  '/js/modules/appbuilder/appbuilder.js',
  '/js/modules/storymode/storymode.js',
  '/js/modules/storymode/ghost-engine.js',
  '/js/modules/storymode/fallback-narratives.js',
  '/js/modules/journal/journal.js',

  // Assets
  '/assets/icons/favicon.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/notes.svg',
  '/assets/icons/rss.svg',
  '/assets/icons/settings.svg',
  '/assets/wallpapers/dumbOS-wallpaper-01.jpg',
];

// Install: precache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old shell caches, keep CDN cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('dumbos-shell-') && key !== SHELL_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: route by origin
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Same-origin: cache-first (precached app shell)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // esm.sh CDN: cache-first with runtime caching
  if (url.hostname === 'esm.sh') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CDN_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else (APIs, external): network-only, pass through
});
