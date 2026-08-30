// Service worker minimal : met en cache les fichiers de l'appli
// pour qu'elle s'ouvre même sans connexion (l'IA reste indisponible hors-ligne,
// mais la cave, la recherche et la fiche de chaque vin restent consultables).
//
// IMPORTANT : la page HTML est toujours récupérée sur le réseau en priorité
// (network-first), pour être sûr d'avoir la dernière version publiée sur
// GitHub. Seuls les fichiers statiques (icônes, manifest) sont servis
// depuis le cache en priorité, car ils changent rarement.

const CACHE_NAME = 'macavavin-cache-v2';
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  const url = event.request.url;

  // Ne jamais mettre en cache les appels à l'API Gemini.
  if(url.indexOf('generativelanguage.googleapis.com') !== -1){
    return;
  }

  const isDocument = event.request.mode === 'navigate' || url.indexOf('index.html') !== -1;

  if(isDocument){
    event.respondWith(
      fetch(event.request).then(function(response){
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, clone); });
        return response;
      }).catch(function(){
        return caches.match(event.request).then(function(cached){
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached){
      if(cached) return cached;
      return fetch(event.request).then(function(response){
        if(response && response.status === 200 && event.request.method === 'GET'){
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache){
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

