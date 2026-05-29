const CACHE_NAME = 'etranscriber-cache-v10';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './meetings.js',
  './audio-processor.js',
  './bvs-service.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// CDN libraries to cache
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://unpkg.com/qrcodejs@1.0.0/qrcode.min.js'
];

// Instalação do Service Worker e caching inicial
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching app shell');
      // Cache local assets first
      return cache.addAll(ASSETS).then(() => {
        // Then try to cache CDN assets (non-blocking)
        return Promise.allSettled(
          CDN_ASSETS.map(url => 
            fetch(url).then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            }).catch(err => {
              console.log('[Service Worker] Failed to cache CDN asset:', url, err);
            })
          )
        );
      });
    })
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately (dentro do waitUntil — correto)
      return self.clients.claim();
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Estratégia Network-First falling back to Cache para os assets locais
self.addEventListener('fetch', e => {
  // Ignora requisições de APIs externas, chrome-extensions e métodos não-GET
  if (e.request.url.includes('api.groq.com') || 
      e.request.url.startsWith('chrome-extension://') ||
      e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Se a requisição foi bem sucedida, clona ela e atualiza o cache
        if (response.ok) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, resClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Se falhar a rede (offline), tenta buscar do cache
        return caches.match(e.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Fallback para página offline se for uma navegação
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          
          // Para outros recursos, retorna uma resposta vazia
          return new Response('Recurso não disponível offline', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
