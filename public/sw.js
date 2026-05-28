const CACHE_VERSION = "v1";
const STATIC_CACHE = `companions-static-${CACHE_VERSION}`;
const PAGES_CACHE = `companions-pages-${CACHE_VERSION}`;

const STATIC_PATTERNS = [/\/_next\/static\//, /\/icons\//, /\/manifest\.json$/];
const API_PATTERNS = [/\/api\//];

// App shell — cached on install for offline support
const APP_SHELL = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Static assets: cache-first (hashed filenames = safe)
  if (STATIC_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // API: network-only (never cache auth/data responses)
  if (API_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(networkOnly(request));
    return;
  }

  // Navigation (HTML pages): network-first, fall back to cached shell
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithShellFallback(request));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(
      JSON.stringify({ error: { code: "OFFLINE", message: "No network connection" } }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function networkFirstWithShellFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request) ?? await caches.match("/");
    return cached ?? new Response("Offline", { status: 503, headers: { "Content-Type": "text/html" } });
  }
}
