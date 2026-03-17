const CACHE_NAME = 'shelfwise-v2'

// Install: immediately activate
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Activate: clean old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first for everything
// Vite hashes filenames so stale cache is never a concern
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET and cross-origin
  if (request.method !== 'GET') return
  if (!request.url.startsWith(self.location.origin)) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for offline use
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => {
        // Offline: serve from cache
        return caches.match(request).then((cached) =>
          cached || (request.mode === 'navigate' ? caches.match('/') : new Response('', { status: 503 }))
        )
      })
  )
})
