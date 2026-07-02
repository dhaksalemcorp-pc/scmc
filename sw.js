// Salem TMS — Service Worker (v112)
// Network-first for the app shell: always try fresh index.html, fall back
// to the cached copy when offline. Combined with the localStorage data
// cache (v111 stale-while-revalidate), officers can open the app with no
// signal and still see their last-loaded dashboard and task list.
var CACHE_NAME = 'salem-tms-shell-v1';

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(['./', './index.html']).catch(function(){ /* best-effort */ });
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
  // Only handle same-origin GET navigation/shell requests.
  // Apps Script API calls (script.google.com) pass through untouched.
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request).then(function(resp) {
      // Fresh copy fetched — update the cache in the background
      var copy = resp.clone();
      caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, copy); });
      return resp;
    }).catch(function() {
      // Offline — serve the cached shell
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
