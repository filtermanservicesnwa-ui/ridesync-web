const SW_VERSION = "ridesync-v20250107-1";
const CORE_CACHE = `ridesync-core-${SW_VERSION}`;
const APP_SHELL = [
  "/",
  "/index.html",
  "/driver.html",
  "/manifest-rider.webmanifest",
  "/manifest-driver.webmanifest",
  "/icons/ridesync-icon-192.png",
  "/icons/ridesync-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CORE_CACHE)
            .map((staleKey) => caches.delete(staleKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(cacheFirst(request));
});

function handleNavigationRequest(request) {
  return fetch(request).catch(() => {
    if (request.url.includes("driver.html")) {
      return caches.match("/driver.html");
    }
    if (request.url.includes("index.html") || request.url.endsWith("/")) {
      return caches.match("/index.html");
    }
    return caches.match("/index.html");
  });
}

async function cacheFirst(request) {
  const cache = await caches.open(CORE_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (
      networkResponse &&
      networkResponse.ok &&
      networkResponse.type === "basic"
    ) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    return cached || Response.error();
  }
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
