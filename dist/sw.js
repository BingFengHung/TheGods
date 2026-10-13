const CACHE='thegods-offline-1a367e03280d';
const FILES=['./','./index.html','./styles.css','./app.mjs','./core.mjs','./commands.mjs','./layout.mjs','./draw.mjs','./storage.mjs','./manifest.webmanifest','./assets/town.webp','./assets/field.webp','./assets/hero-parts.webp','./assets/creatures.webp','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('thegods-offline-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request).then(cached=>cached||fetch(event.request).catch(()=>event.request.mode==='navigate'?cache.match('./index.html'):Response.error()))));});
