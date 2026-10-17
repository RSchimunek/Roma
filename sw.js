/* Service Worker fuer den Rom-Reiseguide.
   Zweck: nach dem ersten Laden laeuft die App vollstaendig ohne Netz.
   Strategie: cache-first. Die Inhalte sind an ein festes Reisedatum gebunden,
   es gibt also nichts, was sich unterwegs aendern muesste.
   Bei neuem Inhalt die VERSION hochzaehlen - das wirft den alten Cache weg. */

const VERSION = "roma-v2";
const DATEIEN = [
  "./",
  "index.html",
  "guide.enc",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      // cache: "reload" umgeht den HTTP-Cache (Pages: max-age=600), sonst landet ein Altstand im neuen Cache
      .then((c) => c.addAll(DATEIEN.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(
        namen.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const anfrage = e.request;
  if (anfrage.method !== "GET") return;
  // Fremde Ziele (Google-Maps-Links) nie abfangen
  if (new URL(anfrage.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(anfrage, { ignoreSearch: true }).then((treffer) => {
      if (treffer) return treffer;
      return fetch(anfrage)
        .then((antwort) => {
          if (antwort && antwort.ok && antwort.type === "basic") {
            const kopie = antwort.clone();
            caches.open(VERSION).then((c) => c.put(anfrage, kopie));
          }
          return antwort;
        })
        .catch(() => caches.match("index.html"));
    })
  );
});
