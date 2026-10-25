// Кеш оболонки застосунку для роботи без інтернету. Дані тут НЕ зберігаються.
const C = "health-shell-v1";
const SHELL = ["./", "index.html", "styles.css", "app.js", "store.js", "i18n.js", "demo.js", "config.js", "manifest.webmanifest", "privacy.html", "icons/icon.svg", "icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // Google, Drive, AI — завжди напряму
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
