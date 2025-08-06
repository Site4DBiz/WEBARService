// IndexedDB を使用したオフラインデータ管理

const DB_NAME = 'WebARServiceDB';
const DB_VERSION = 1;

// ストア名の定義
export const STORES = {
  AR_CONTENT: 'ar_content',
  MARKERS: 'markers',
  PENDING_SYNC: 'pending_sync',
  CACHED_DATA: 'cached_data',
} as const;

export interface PendingSyncItem {
  id: string;
  type: 'ar-content' | 'marker' | 'user-data';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface CachedData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
}

class OfflineDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  // データベースを初期化
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // ARコンテンツストア
        if (!db.objectStoreNames.contains(STORES.AR_CONTENT)) {
          const arContentStore = db.createObjectStore(STORES.AR_CONTENT, { keyPath: 'id' });
          arContentStore.createIndex('user_id', 'user_id', { unique: false });
          arContentStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // マーカーストア
        if (!db.objectStoreNames.contains(STORES.MARKERS)) {
          const markersStore = db.createObjectStore(STORES.MARKERS, { keyPath: 'id' });
          markersStore.createIndex('user_id', 'user_id', { unique: false });
          markersStore.createIndex('category', 'category', { unique: false });
        }

        // 同期待ちデータストア
        if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
          const pendingSyncStore = db.createObjectStore(STORES.PENDING_SYNC, { keyPath: 'id' });
          pendingSyncStore.createIndex('type', 'type', { unique: false });
          pendingSyncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // キャッシュデータストア
        if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
          const cachedDataStore = db.createObjectStore(STORES.CACHED_DATA, { keyPath: 'key' });
          cachedDataStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  // データを保存
  async save(storeName: string, data: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => {
        console.error('Failed to save data:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  // データを取得
  async get(storeName: string, key: string): Promise<any> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => {
        console.error('Failed to get data:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  // すべてのデータを取得
  async getAll(storeName: string): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => {
        console.error('Failed to get all data:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  // インデックスで検索
  async getByIndex(storeName: string, indexName: string, value: any): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onerror = () => {
        console.error('Failed to get data by index:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  // データを削除
  async delete(storeName: string, key: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => {
        console.error('Failed to delete data:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  // ストアをクリア
  async clear(storeName: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => {
        console.error('Failed to clear store:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  // 同期待ちデータを追加
  async addPendingSync(item: Omit<PendingSyncItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const pendingItem: PendingSyncItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await this.save(STORES.PENDING_SYNC, pendingItem);
  }

  // 同期待ちデータを取得
  async getPendingSync(): Promise<PendingSyncItem[]> {
    return this.getAll(STORES.PENDING_SYNC);
  }

  // 同期待ちデータを削除
  async removePendingSync(id: string): Promise<void> {
    await this.delete(STORES.PENDING_SYNC, id);
  }

  // キャッシュデータを保存
  async cacheData(key: string, data: any, ttl?: number): Promise<void> {
    const cachedItem: CachedData = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
    };

    await this.save(STORES.CACHED_DATA, cachedItem);
  }

  // キャッシュデータを取得
  async getCachedData(key: string): Promise<any | null> {
    const cached = await this.get(STORES.CACHED_DATA, key);
    
    if (!cached) return null;
    
    // 有効期限をチェック
    if (cached.expiresAt && cached.expiresAt < Date.now()) {
      await this.delete(STORES.CACHED_DATA, key);
      return null;
    }
    
    return cached.data;
  }

  // 期限切れキャッシュをクリーンアップ
  async cleanupExpiredCache(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const transaction = this.db.transaction([STORES.CACHED_DATA], 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_DATA);
    const index = store.index('expiresAt');
    const range = IDBKeyRange.upperBound(now);
    const request = index.openCursor(range);

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
  }
}

// シングルトンインスタンス
export const offlineDB = new OfflineDatabase();

// オフライン同期マネージャー
export class OfflineSyncManager {
  private syncInProgress = false;

  // 同期を実行
  async sync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      console.log('Cannot sync while offline');
      return;
    }

    this.syncInProgress = true;

    try {
      const pendingItems = await offlineDB.getPendingSync();
      console.log(`Syncing ${pendingItems.length} pending items`);

      for (const item of pendingItems) {
        try {
          await this.syncItem(item);
          await offlineDB.removePendingSync(item.id);
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          
          // リトライカウントを増やす
          item.retryCount++;
          
          // 最大リトライ回数を超えたら削除
          if (item.retryCount > 3) {
            console.error(`Max retries exceeded for item ${item.id}, removing`);
            await offlineDB.removePendingSync(item.id);
          } else {
            await offlineDB.save(STORES.PENDING_SYNC, item);
          }
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  // 個別アイテムを同期
  private async syncItem(item: PendingSyncItem): Promise<void> {
    const endpoint = this.getEndpoint(item.type);
    const method = this.getMethod(item.action);

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item.data),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }
  }

  // エンドポイントを取得
  private getEndpoint(type: string): string {
    switch (type) {
      case 'ar-content':
        return '/api/ar-contents';
      case 'marker':
        return '/api/ar-markers';
      case 'user-data':
        return '/api/profile';
      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  }

  // HTTPメソッドを取得
  private getMethod(action: string): string {
    switch (action) {
      case 'create':
        return 'POST';
      case 'update':
        return 'PUT';
      case 'delete':
        return 'DELETE';
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

export const offlineSyncManager = new OfflineSyncManager();

// デフォルトエクスポート
export default offlineDB;