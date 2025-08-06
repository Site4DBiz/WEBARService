// Service Worker for WebAR Service
// Version: 2.0.0 - Next.js 14 App Router対応版

const CACHE_VERSION = 'v2';
const CACHE_NAME = `webar-service-${CACHE_VERSION}`;
const RUNTIME_CACHE = `webar-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `webar-images-${CACHE_VERSION}`;
const AR_ASSETS_CACHE = `webar-ar-assets-${CACHE_VERSION}`;
const NEXT_DATA_CACHE = `webar-next-data-${CACHE_VERSION}`;

// キャッシュの最大サイズと有効期限
const CACHE_CONFIG = {
  maxAge: {
    static: 30 * 24 * 60 * 60 * 1000, // 30日
    runtime: 7 * 24 * 60 * 60 * 1000, // 7日
    images: 14 * 24 * 60 * 60 * 1000, // 14日
    ar: 30 * 24 * 60 * 60 * 1000, // 30日
    api: 5 * 60 * 1000, // 5分
  },
  maxEntries: {
    runtime: 50,
    images: 100,
    ar: 50,
  },
};

// 静的リソースのキャッシュリスト（App Shellパターン）
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// ARライブラリのキャッシュリスト
const AR_LIBRARY_URLS = [
  '/lib/mindar-image.prod.js',
  '/lib/mindar-image-aframe.prod.js',
  '/lib/mindar-face.prod.js',
  '/lib/mindar-face-aframe.prod.js',
  '/targets/default.mind',
];

// キャッシュ戦略の定義
const CACHE_STRATEGIES = {
  // キャッシュファースト（静的アセット）
  cacheFirst: [
    /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
    /fonts\.googleapis\.com/,
    /fonts\.gstatic\.com/,
    /_next\/static\//,
    /\.(?:woff2?|ttf|otf)$/i,
    /\.(?:js|css)$/i,
  ],
  
  // ネットワークファースト（API、動的コンテンツ）
  networkFirst: [
    /\/api\//,
    /supabase/,
    /_next\/data\//,
    /\.json$/,
  ],
  
  // Stale While Revalidate（中間的なコンテンツ）
  staleWhileRevalidate: [
    /\/ar-markers/,
    /\/ar-contents/,
    /\/analytics/,
    /\/dashboard/,
  ],
  
  // ネットワークオンリー（認証、リアルタイム）
  networkOnly: [
    /\/auth\//,
    /\/profile/,
    /\/realtime/,
    /websocket/,
  ],
};

// Service Worker インストール
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install - Version:', CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        // 静的キャッシュを作成
        const cache = await caches.open(CACHE_NAME);
        console.log('[ServiceWorker] Caching app shell');
        
        // 静的リソースを並列でキャッシュ
        const cachePromises = STATIC_CACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, {
              cache: 'no-cache',
            });
            if (response.ok) {
              await cache.put(url, response);
              console.log(`[ServiceWorker] Cached: ${url}`);
            }
          } catch (error) {
            console.warn(`[ServiceWorker] Failed to cache ${url}:`, error);
          }
        });
        
        await Promise.allSettled(cachePromises);
        
        // ARライブラリをキャッシュ
        const arCache = await caches.open(AR_ASSETS_CACHE);
        const arCachePromises = AR_LIBRARY_URLS.map(async (url) => {
          try {
            const response = await fetch(url, {
              cache: 'no-cache',
            });
            if (response.ok) {
              await arCache.put(url, response);
              console.log(`[ServiceWorker] Cached AR asset: ${url}`);
            }
          } catch (error) {
            console.warn(`[ServiceWorker] Failed to cache AR asset ${url}:`, error);
          }
        });
        
        await Promise.allSettled(arCachePromises);
        
        console.log('[ServiceWorker] Installation complete');
        
        // すぐにアクティブ化
        await self.skipWaiting();
      } catch (error) {
        console.error('[ServiceWorker] Installation failed:', error);
      }
    })()
  );
});

// Service Worker アクティベート
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate - Version:', CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        // 古いキャッシュを削除
        const cacheNames = await caches.keys();
        const currentCaches = [
          CACHE_NAME,
          RUNTIME_CACHE,
          IMAGE_CACHE,
          AR_ASSETS_CACHE,
          NEXT_DATA_CACHE,
        ];
        
        const deletePromises = cacheNames
          .filter(cacheName => !currentCaches.includes(cacheName))
          .map(async (cacheName) => {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            await caches.delete(cacheName);
          });
        
        await Promise.all(deletePromises);
        
        // すべてのクライアントを制御
        await self.clients.claim();
        
        console.log('[ServiceWorker] Activation complete');
      } catch (error) {
        console.error('[ServiceWorker] Activation failed:', error);
      }
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
  
  // Chrome拡張機能のリクエストを無視
  if (url.pathname.includes('chrome-extension')) {
    return;
  }
  
  // WebSocketリクエストを無視
  if (request.headers.get('upgrade') === 'websocket') {
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
  
  // Next.js特有のパスを処理
  if (url.includes('_next/image')) {
    return 'cacheFirst';
  }
  
  if (url.includes('_next/data')) {
    return 'networkFirst';
  }
  
  // 定義された戦略パターンをチェック
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
  try {
    // キャッシュから取得を試みる
    const cachedResponse = await getCachedResponse(request);
    if (cachedResponse) {
      // バックグラウンドで更新（非同期）
      refreshCache(request);
      return cachedResponse;
    }
    
    // キャッシュがない場合はネットワークから取得
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(getCacheName(request));
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Cache first failed:', error);
    return createOfflineResponse(request);
  }
}

// ネットワークファースト戦略
async function networkFirstStrategy(request) {
  try {
    // タイムアウトを設定してネットワークリクエスト
    const networkResponse = await fetchWithTimeout(request, 5000);
    
    if (networkResponse.ok) {
      const cache = await caches.open(getCacheName(request));
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // ネットワークエラー時はキャッシュから取得
    const cachedResponse = await getCachedResponse(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // キャッシュもない場合はオフラインレスポンス
    return createOfflineResponse(request);
  }
}

// Stale While Revalidate戦略
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await getCachedResponse(request);
  
  // バックグラウンドで更新
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const cache = await caches.open(getCacheName(request));
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(error => {
    console.error('[ServiceWorker] Background fetch failed:', error);
    return null;
  });
  
  // キャッシュがあればすぐに返す
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // キャッシュがない場合はネットワークレスポンスを待つ
  const networkResponse = await fetchPromise;
  return networkResponse || createOfflineResponse(request);
}

// ネットワークオンリー戦略
async function networkOnlyStrategy(request) {
  try {
    return await fetchWithTimeout(request, 10000);
  } catch (error) {
    console.error('[ServiceWorker] Network only failed:', error);
    return createOfflineResponse(request);
  }
}

// タイムアウト付きフェッチ
async function fetchWithTimeout(request, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(request, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// キャッシュから応答を取得
async function getCachedResponse(request) {
  const cacheName = getCacheName(request);
  const cache = await caches.open(cacheName);
  return await cache.match(request);
}

// リクエストに応じたキャッシュ名を取得
function getCacheName(request) {
  const url = request.url;
  
  if (/\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i.test(url)) {
    return IMAGE_CACHE;
  }
  
  if (url.includes('/lib/mindar') || url.includes('.mind')) {
    return AR_ASSETS_CACHE;
  }
  
  if (url.includes('_next/data')) {
    return NEXT_DATA_CACHE;
  }
  
  if (url.includes('_next/static')) {
    return CACHE_NAME;
  }
  
  return RUNTIME_CACHE;
}

// バックグラウンドでキャッシュを更新
async function refreshCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(getCacheName(request));
      await cache.put(request, response);
    }
  } catch (error) {
    // バックグラウンド更新のエラーは無視
  }
}

// オフラインレスポンスを作成
function createOfflineResponse(request) {
  const url = new URL(request.url);
  
  // ナビゲーションリクエストの場合はオフラインページを返す
  if (request.mode === 'navigate') {
    return caches.match('/offline.html') || new Response(
      `<!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>オフライン - WebAR Service</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          h1 { font-size: 2rem; margin-bottom: 1rem; }
          p { font-size: 1.2rem; opacity: 0.9; }
          button {
            margin-top: 2rem;
            padding: 12px 24px;
            font-size: 1rem;
            color: #667eea;
            background: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
          }
          button:hover { opacity: 0.9; }
        </style>
      </head>
      <body>
        <h1>📡 オフラインです</h1>
        <p>インターネット接続を確認してください</p>
        <button onclick="location.reload()">再試行</button>
      </body>
      </html>`,
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'text/html; charset=utf-8',
        }),
      }
    );
  }
  
  // APIリクエストの場合はJSONレスポンス
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        error: 'オフラインです',
        message: 'インターネット接続を確認してください',
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      }
    );
  }
  
  // その他のリクエスト
  return new Response('オフラインです', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: new Headers({
      'Content-Type': 'text/plain; charset=utf-8',
    }),
  });
}

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-ar-content') {
    event.waitUntil(syncARContent());
  } else if (event.tag === 'sync-user-data') {
    event.waitUntil(syncUserData());
  } else if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

// ARコンテンツの同期
async function syncARContent() {
  try {
    // IndexedDBから保留中のデータを取得して同期
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
          await removePendingARContent(data.id);
          console.log(`[ServiceWorker] Synced AR content: ${data.id}`);
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
    const response = await fetch('/api/sync/user-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      console.log('[ServiceWorker] User data synced successfully');
    }
  } catch (error) {
    console.error('[ServiceWorker] User data sync failed:', error);
  }
}

// アナリティクスデータの同期
async function syncAnalytics() {
  try {
    const analyticsData = await getOfflineAnalytics();
    
    if (analyticsData && analyticsData.length > 0) {
      const response = await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: analyticsData }),
      });
      
      if (response.ok) {
        await clearOfflineAnalytics();
        console.log('[ServiceWorker] Analytics synced successfully');
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Analytics sync failed:', error);
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
    tag: 'notification',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: '表示',
      },
      {
        action: 'close',
        title: '閉じる',
      },
    ],
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
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

// メッセージ処理
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches());
      break;
    case 'CACHE_AR_ASSET':
      event.waitUntil(cacheARAsset(event.data.url));
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_VERSION });
      break;
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(event.data.urls));
      break;
  }
});

// 指定されたURLをキャッシュ
async function cacheUrls(urls) {
  if (!urls || !Array.isArray(urls)) return;
  
  const cache = await caches.open(RUNTIME_CACHE);
  const cachePromises = urls.map(async (url) => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        console.log(`[ServiceWorker] Cached: ${url}`);
      }
    } catch (error) {
      console.error(`[ServiceWorker] Failed to cache ${url}:`, error);
    }
  });
  
  await Promise.allSettled(cachePromises);
}

// すべてのキャッシュをクリア
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    console.log('[ServiceWorker] All caches cleared');
  } catch (error) {
    console.error('[ServiceWorker] Failed to clear caches:', error);
  }
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

// IndexedDB ヘルパー関数（スタブ）
async function getPendingARContent() {
  // 実際の実装では IndexedDB から取得
  return [];
}

async function removePendingARContent(id) {
  // 実際の実装では IndexedDB から削除
  console.log('[ServiceWorker] Removed pending AR content:', id);
}

async function getOfflineAnalytics() {
  // 実際の実装では IndexedDB から取得
  return [];
}

async function clearOfflineAnalytics() {
  // 実際の実装では IndexedDB をクリア
  console.log('[ServiceWorker] Cleared offline analytics');
}

// Service Worker のバージョン情報
console.log('[ServiceWorker] Script loaded - Version:', CACHE_VERSION);