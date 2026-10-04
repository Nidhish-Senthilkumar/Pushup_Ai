/**
 * Redirects for the hostnames that aren't the main site.
 *
 * app.getcadence.cc used to be the Cadence task app, installed as a PWA by some
 * people. Its service worker serves the old app from its own cache and never
 * asks the network for the page, so a plain redirect would never reach them.
 * What it does ask the network for is /sw.js, to check for an update. So /sw.js
 * here is a replacement worker that deletes the old caches, removes itself and
 * reloads the page, which then follows the redirect like any other visit.
 */

const RETIRE_OLD_APP = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: "window", includeUncontrolled: true })) client.navigate(client.url);
  })());
});
`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/sw.js") {
      return new Response(RETIRE_OLD_APP, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" } });
    }
    // www keeps the path. The old app's paths (sign-in links and so on) mean nothing to the new one, so they go to the home page.
    const target = url.hostname.startsWith("www.") ? new URL(url.pathname + url.search, env.CANONICAL) : new URL("/", env.CANONICAL);
    return Response.redirect(target.href, 301);
  },
};
