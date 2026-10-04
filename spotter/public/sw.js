/*
 * Offline support. The pose model and runtime are large and never change at a
 * given path (paths are content-hashed), so they're cached forever on first
 * use. Everything else is network-first, falling back to the cache when the
 * convention Wi-Fi drops.
 */
const CACHE = "spotter-v3";

self.addEventListener("install", () => self.skipWaiting());

// The page sends the files it already loaded (before this worker was in
// control) plus the pose model and runtime, so the app works offline after a
// single visit, even if no workout was started.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "cache" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        data.urls
          .filter((u) => typeof u === "string" && new URL(u, self.location.href).origin === self.location.origin)
          .map((u) =>
            cache.match(u, { ignoreVary: true }).then((hit) => hit || fetch(u).then((res) => (res.ok ? cache.put(u, res) : undefined)).catch(() => undefined)),
          ),
      ),
    ),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const immutable = (url) => /\/(models|mediapipe)\//.test(url.pathname) || /\/assets\//.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (immutable(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        // ignoreVary: module scripts carry an Origin header that pre-cached copies don't.
        const hit = await cache.match(req, { ignoreVary: true });
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) await cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Clone before handing the response to the page: once the page reads
        // the body, a later clone() fails and nothing gets cached.
        if (res.ok) {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(req, { ignoreSearch: true, ignoreVary: true })
          .then((hit) => hit || (req.mode === "navigate" ? caches.match("./", { ignoreVary: true }) : undefined))
          .then((hit) => hit || Response.error()),
      ),
  );
});
