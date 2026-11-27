// Salem TMS — Service Worker (v134)
// Network-first for the app shell: always try the fresh page, fall back to
// the saved copy when there is no signal, so officers can still open the
// app offline (their saved updates/photos are sent when signal returns).
// v134: also keeps the install files (manifest + icons) for the phone app.
var CACHE_NAME = 'salem-tms-shell-v4';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL).catch(function(){ /* best-effort */ });
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  // Only same-origin GET requests (the app page and its files).
  // Apps Script API calls (script.google.com) and photos pass through untouched.
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request).then(function(resp) {
      var copy = resp.clone();
      caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, copy); });
      return resp;
    }).catch(function() {
      return caches.match(e.request, { ignoreSearch: true }).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
