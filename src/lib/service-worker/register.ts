// Service Worker登録と管理

export interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig = {};

  async register(config: ServiceWorkerConfig = {}) {
    this.config = config;

    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker is not supported in this browser');
      return;
    }

    try {
      // Service Workerを登録
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      
      this.registration = registration;
      console.log('Service Worker registered successfully:', registration.scope);

      // 更新チェック
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新しいService Workerがインストールされた
              console.log('New Service Worker available');
              if (this.config.onUpdate) {
                this.config.onUpdate(registration);
              }
            }
          });
        }
      });

      // 初回登録成功
      if (registration.active && this.config.onSuccess) {
        this.config.onSuccess(registration);
      }

      // オンライン/オフライン状態の監視
      this.setupNetworkListeners();

      // Service Workerからのメッセージを処理
      this.setupMessageListener();

      // 定期的に更新をチェック
      this.startUpdateCheck();

    } catch (error) {
      console.error('Service Worker registration failed:', error);
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
    }
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('Network: Online');
      if (this.config.onOnline) {
        this.config.onOnline();
      }
    });

    window.addEventListener('offline', () => {
      console.log('Network: Offline');
      if (this.config.onOffline) {
        this.config.onOffline();
      }
    });
  }

  private setupMessageListener() {
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('Message from Service Worker:', event.data);
      
      // メッセージタイプに応じた処理
      switch (event.data.type) {
        case 'CACHE_UPDATED':
          this.handleCacheUpdate(event.data);
          break;
        case 'SYNC_COMPLETE':
          this.handleSyncComplete(event.data);
          break;
        case 'NOTIFICATION_CLICK':
          this.handleNotificationClick(event.data);
          break;
      }
    });
  }

  private handleCacheUpdate(data: any) {
    console.log('Cache updated:', data);
    // キャッシュ更新の処理
  }

  private handleSyncComplete(data: any) {
    console.log('Sync complete:', data);
    // 同期完了の処理
  }

  private handleNotificationClick(data: any) {
    console.log('Notification clicked:', data);
    // 通知クリックの処理
  }

  private startUpdateCheck() {
    // 1時間ごとに更新をチェック
    setInterval(() => {
      if (this.registration) {
        this.registration.update().catch((error) => {
          console.error('Failed to check for updates:', error);
        });
      }
    }, 60 * 60 * 1000);
  }

  // Service Workerを更新
  async update() {
    if (!this.registration) {
      console.warn('No Service Worker registration found');
      return;
    }

    try {
      await this.registration.update();
      console.log('Service Worker update initiated');
    } catch (error) {
      console.error('Failed to update Service Worker:', error);
    }
  }

  // Service Workerをスキップして新しいバージョンをアクティブ化
  async skipWaiting() {
    if (!this.registration || !this.registration.waiting) {
      console.warn('No waiting Service Worker found');
      return;
    }

    // Service Workerにスキップメッセージを送信
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  // キャッシュをクリア
  async clearCache() {
    if (!navigator.serviceWorker.controller) {
      console.warn('No active Service Worker found');
      return;
    }

    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
  }

  // ARアセットをキャッシュ
  async cacheARAsset(url: string) {
    if (!navigator.serviceWorker.controller) {
      console.warn('No active Service Worker found');
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_AR_ASSET',
      url,
    });
  }

  // バックグラウンド同期を登録
  async registerSync(tag: string) {
    if (!this.registration || !('sync' in this.registration)) {
      console.warn('Background sync is not supported');
      return;
    }

    try {
      await this.registration.sync.register(tag);
      console.log(`Background sync registered: ${tag}`);
    } catch (error) {
      console.error('Failed to register background sync:', error);
    }
  }

  // プッシュ通知の購読
  async subscribePush(applicationServerKey: string) {
    if (!this.registration || !('pushManager' in this.registration)) {
      console.warn('Push notifications are not supported');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(applicationServerKey),
      });
      
      console.log('Push subscription successful:', subscription);
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  // プッシュ通知の購読解除
  async unsubscribePush() {
    if (!this.registration || !('pushManager' in this.registration)) {
      console.warn('Push notifications are not supported');
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Push subscription cancelled');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  // 通知権限を要求
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('Notifications are not supported');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }

  // Base64文字列をUint8Arrayに変換
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Service Worker登録を解除
  async unregister() {
    if (!this.registration) {
      console.warn('No Service Worker registration found');
      return false;
    }

    try {
      const success = await this.registration.unregister();
      if (success) {
        console.log('Service Worker unregistered successfully');
        this.registration = null;
      }
      return success;
    } catch (error) {
      console.error('Failed to unregister Service Worker:', error);
      return false;
    }
  }

  // Service Workerの状態を取得
  getStatus() {
    if (!this.registration) {
      return {
        registered: false,
        active: false,
        waiting: false,
        installing: false,
      };
    }

    return {
      registered: true,
      active: !!this.registration.active,
      waiting: !!this.registration.waiting,
      installing: !!this.registration.installing,
      scope: this.registration.scope,
    };
  }
}

// シングルトンインスタンス
export const serviceWorkerManager = new ServiceWorkerManager();

// デフォルトエクスポート
export default serviceWorkerManager;