// Service Worker for WebAR Service
// Version: 1.0.0

const CACHE_NAME = 'webar-service-v1';
const RUNTIME_CACHE = 'webar-runtime-v1';
const IMAGE_CACHE = 'webar-images-v1';
const AR_ASSETS_CACHE = 'webar-ar-assets-v1';

// 静的リソースのキャッシュリスト
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/_next/static/css/app.css',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/framework.js',
  '/_next/static/chunks/pages/_app.js',
  '/favicon.ico',
];

// ARライブラリのキャッシュリスト
const AR_LIBRARY_URLS = [
  '/lib/mindar-image.js',
  '/lib/mindar-image-three.js',
  '/lib/mindar-face.js',
  '/lib/mindar-face-three.js',
  '/targets/musicband-raccoon.mind',
  '/targets/card.mind',
];

// キャッシュ戦略の定義
const CACHE_STRATEGIES = {
  cacheFirst: [
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
    /fonts\.googleapis\.com/,
    /fonts\.gstatic\.com/,
    /_next\/static/,
    /\.woff2?$/,
  ],
  networkFirst: [
    /\/api\//,
    /supabase/,
    /\.json$/,
  ],
  staleWhileRevalidate: [
    /\.(?:js|css)$/,
    /\/ar-markers/,
    /\/ar-contents/,
  ],
  networkOnly: [
    /\/auth\//,
    /\/profile\//,
  ],
};

// Service Worker インストール
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('[ServiceWorker] Caching app shell');
      
      // 静的リソースをキャッシュ（エラーをスキップ）
      const cachePromises = STATIC_CACHE_URLS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (error) {
          console.warn(`[ServiceWorker] Failed to cache ${url}:`, error);
        }
      });
      
      await Promise.all(cachePromises);
      
      // ARライブラリをキャッシュ
      const arCache = await caches.open(AR_ASSETS_CACHE);
      const arCachePromises = AR_LIBRARY_URLS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await arCache.put(url, response);
          }
        } catch (error) {
          console.warn(`[ServiceWorker] Failed to cache AR asset ${url}:`, error);
        }
      });
      
      await Promise.all(arCachePromises);
      
      // すぐにアクティブ化
      await self.skipWaiting();
    })()
  );
});

// Service Worker アクティベート
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    (async () => {
      // 古いキャッシュを削除
      const cacheNames = await caches.keys();
      const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE, AR_ASSETS_CACHE];
      
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            await caches.delete(cacheName);
          }
        })
      );
      
      // すべてのクライアントを制御
      await self.clients.claim();
    })()
  );
});

// フェッチイベントの処理
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 同一オリジンのリクエストのみ処理
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // キャッシュ戦略を選択
  const strategy = getStrategy(request);
  
  switch (strategy) {
    case 'cacheFirst':
      event.respondWith(cacheFirstStrategy(request));
      break;
    case 'networkFirst':
      event.respondWith(networkFirstStrategy(request));
      break;
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidateStrategy(request));
      break;
    case 'networkOnly':
      event.respondWith(networkOnlyStrategy(request));
      break;
    default:
      event.respondWith(networkFirstStrategy(request));
  }
});

// キャッシュ戦略の判定
function getStrategy(request) {
  const url = request.url;
  
  for (const [strategy, patterns] of Object.entries(CACHE_STRATEGIES)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return strategy;
      }
    }
  }
  
  return 'networkFirst';
}

// キャッシュファースト戦略
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Fetch failed:', error);
    return new Response('オフラインです', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain; charset=utf-8',
      }),
    });
  }
}

// ネットワークファースト戦略
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // オフラインページを返す
    if (request.mode === 'navigate') {
      const offlineCache = await caches.open(CACHE_NAME);
      return offlineCache.match('/offline.html') || new Response('オフラインです');
    }
    
    return new Response('オフラインです', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Stale While Revalidate戦略
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// ネットワークオンリー戦略
async function networkOnlyStrategy(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response('ネットワークエラー', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-ar-content') {
    event.waitUntil(syncARContent());
  } else if (event.tag === 'sync-user-data') {
    event.waitUntil(syncUserData());
  }
});

// ARコンテンツの同期
async function syncARContent() {
  try {
    // IndexedDBから保留中のデータを取得
    const pendingData = await getPendingARContent();
    
    for (const data of pendingData) {
      try {
        const response = await fetch('/api/ar-contents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (response.ok) {
          // 成功したら保留データを削除
          await removePendingARContent(data.id);
        }
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync AR content:', error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
  }
}

// ユーザーデータの同期
async function syncUserData() {
  try {
    // ユーザーデータの同期処理
    const response = await fetch('/api/sync/user-data', {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Sync failed');
    }
  } catch (error) {
    console.error('[ServiceWorker] User data sync failed:', error);
  }
}

// プッシュ通知の受信
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received:', event);
  
  let title = 'WebAR Service';
  let options = {
    body: '新しいお知らせがあります',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options = { ...options, ...data.options };
    } catch (error) {
      console.error('[ServiceWorker] Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 通知のクリック処理
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

// メッセージ処理
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  } else if (event.data.type === 'CACHE_AR_ASSET') {
    event.waitUntil(cacheARAsset(event.data.url));
  }
});

// すべてのキャッシュをクリア
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
  console.log('[ServiceWorker] All caches cleared');
}

// AR アセットをキャッシュ
async function cacheARAsset(url) {
  try {
    const cache = await caches.open(AR_ASSETS_CACHE);
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(url, response);
      console.log('[ServiceWorker] AR asset cached:', url);
    }
  } catch (error) {
    console.error('[ServiceWorker] Failed to cache AR asset:', error);
  }
}

// ヘルパー関数（IndexedDB操作用のスタブ）
async function getPendingARContent() {
  // IndexedDBから保留中のARコンテンツを取得
  return [];
}

async function removePendingARContent(id) {
  // IndexedDBから保留中のARコンテンツを削除
  console.log('[ServiceWorker] Removed pending AR content:', id);
}

console.log('[ServiceWorker] Script loaded');