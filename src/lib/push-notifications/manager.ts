// プッシュ通知マネージャー

import serviceWorkerManager from '@/lib/service-worker/register'

// VAPIDキー（実際のプロジェクトでは環境変数から取得）
const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BKd0nz5Kf-x_KdlGrJCUXs-wYPr5cWYH3LmLbLPWYvGzXwJveSx6BhJvPVPGfXCxPRVgYxv3hR3mFzG_6hLbDfk'

export interface NotificationOptions {
  title: string
  body?: string
  icon?: string
  badge?: string
  image?: string
  tag?: string
  data?: any
  requireInteraction?: boolean
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

class PushNotificationManager {
  private subscription: PushSubscription | null = null

  // 通知権限を確認
  async checkPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return 'denied'
    }
    return Notification.permission
  }

  // 通知権限をリクエスト
  async requestPermission(): Promise<NotificationPermission> {
    const permission = await serviceWorkerManager.requestNotificationPermission()
    return permission
  }

  // プッシュ通知を購読
  async subscribe(): Promise<PushSubscription | null> {
    try {
      // 通知権限を確認
      const permission = await this.checkPermission()
      if (permission !== 'granted') {
        const newPermission = await this.requestPermission()
        if (newPermission !== 'granted') {
          console.warn('Notification permission denied')
          return null
        }
      }

      // Service Workerを確認
      const registration = await navigator.serviceWorker.ready
      if (!registration) {
        console.error('Service Worker not ready')
        return null
      }

      // 既存の購読を確認
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        // 新規購読
        subscription = await serviceWorkerManager.subscribePush(VAPID_PUBLIC_KEY)
      }

      if (subscription) {
        this.subscription = subscription
        // サーバーに購読情報を送信
        await this.sendSubscriptionToServer(subscription)
      }

      return subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  // プッシュ通知の購読を解除
  async unsubscribe(): Promise<boolean> {
    try {
      if (this.subscription) {
        // サーバーから購読情報を削除
        await this.removeSubscriptionFromServer(this.subscription)
      }

      const success = await serviceWorkerManager.unsubscribePush()
      if (success) {
        this.subscription = null
      }
      return success
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
      return false
    }
  }

  // 購読状態を確認
  async getSubscription(): Promise<PushSubscription | null> {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      this.subscription = subscription
      return subscription
    } catch (error) {
      console.error('Failed to get subscription:', error)
      return null
    }
  }

  // ローカル通知を表示
  async showLocalNotification(options: NotificationOptions): Promise<void> {
    try {
      const permission = await this.checkPermission()
      if (permission !== 'granted') {
        console.warn('Notification permission not granted')
        return
      }

      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/badge-72x72.png',
        image: options.image,
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction,
        actions: options.actions,
        vibrate: [200, 100, 200],
      })
    } catch (error) {
      console.error('Failed to show notification:', error)
    }
  }

  // テスト通知を送信
  async sendTestNotification(): Promise<void> {
    await this.showLocalNotification({
      title: 'WebAR Service',
      body: 'プッシュ通知のテストです',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        url: '/',
        timestamp: Date.now(),
      },
    })
  }

  // サーバーに購読情報を送信
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send subscription to server')
      }

      console.log('Subscription sent to server successfully')
    } catch (error) {
      console.error('Failed to send subscription to server:', error)
    }
  }

  // サーバーから購読情報を削除
  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server')
      }

      console.log('Subscription removed from server successfully')
    } catch (error) {
      console.error('Failed to remove subscription from server:', error)
    }
  }

  // 通知設定を取得
  async getNotificationSettings() {
    const permission = await this.checkPermission()
    const subscription = await this.getSubscription()

    return {
      permission,
      isSubscribed: !!subscription,
      subscription,
      isSupported: 'Notification' in window && 'serviceWorker' in navigator,
    }
  }
}

// シングルトンインスタンス
export const pushNotificationManager = new PushNotificationManager()

// デフォルトエクスポート
export default pushNotificationManager
