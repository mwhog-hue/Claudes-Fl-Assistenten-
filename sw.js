/* RH-Flächensuchassistent – Service Worker: startet die App auch ohne Internet (z. B. im Funkloch).
   Die Daten liegen im lokalen Gerätespeicher, nicht in diesem Cache.
   Bei jeder neuen Version CACHE_VERSION erhöhen. */
const CACHE_VERSION = 'flaechensuche-2.5.0';
const DATEIEN = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
/* Kartenbibliothek (Leaflet + Zeichenwerkzeug): wird mitgespeichert, damit die Karte offline zumindest startet
   und zuletzt angesehene Kacheln aus dem Browser-Cache anzeigen kann. Kacheln selbst benötigen weiterhin Internet. */
const BIBLIOTHEKEN = [
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_VERSION).then(c=>
    // Einzeln laden: eine fehlende Datei (z. B. ein Icon) darf die Installation nicht komplett verhindern.
    Promise.allSettled([...DATEIEN, ...BIBLIOTHEKEN].map(u=>c.add(u).catch(()=>{})))
  ).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE_VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  const u = new URL(e.request.url);
  if(u.origin===location.origin){
    // App-Dateien: Netz zuerst (Aktualisierungen kommen an), sonst Cache
    e.respondWith(fetch(e.request).then(r=>{ const k=r.clone(); caches.open(CACHE_VERSION).then(c=>c.put(e.request,k)); return r; })
      .catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
    return;
  }
  if(u.host==='cdnjs.cloudflare.com'){
    // Bibliotheken: Cache zuerst (Versionen sind in der Adresse festgeschrieben); auch Tesseract wird so nach erstem Gebrauch offline verfügbar
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{ const k=n.clone(); caches.open(CACHE_VERSION).then(c=>c.put(e.request,k)); return n; })));
  }
  // Wetter, Höhen, Geocoding, Kartenkacheln, KI-Anbieter und OSRM laufen bewusst am Service Worker vorbei.
});
