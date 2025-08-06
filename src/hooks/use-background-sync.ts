'use client'

import { useEffect, useCallback, useState } from 'react'
import { offlineDB, offlineSyncManager } from '@/lib/offline/indexed-db'
import serviceWorkerManager from '@/lib/service-worker/register'

export interface UseBackgroundSyncOptions {
  autoSync?: boolean
  syncInterval?: number
}

export function useBackgroundSync(options: UseBackgroundSyncOptions = {}) {
  const { autoSync = true, syncInterval = 30000 } = options // デフォルト30秒
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // 保留中のアイテム数を取得
  const updatePendingCount = useCallback(async () => {
    try {
      const items = await offlineDB.getPendingSync()
      setPendingCount(items.length)
    } catch (error) {
      console.error('Failed to get pending count:', error)
    }
  }, [])

  // 手動同期
  const syncNow = useCallback(async () => {
    if (isSyncing) {
      console.log('Sync already in progress')
      return
    }

    setIsSyncing(true)
    try {
      await offlineSyncManager.sync()
      setLastSyncTime(new Date())
      await updatePendingCount()

      // Service Workerにも同期を通知
      await serviceWorkerManager.registerSync('sync-user-data')
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, updatePendingCount])

  // ARコンテンツをオフラインで保存
  const saveARContentOffline = useCallback(
    async (content: any) => {
      try {
        // IndexedDBに保存
        await offlineDB.save('ar_content', content)

        // 同期待ちリストに追加
        await offlineDB.addPendingSync({
          type: 'ar-content',
          action: 'create',
          data: content,
        })

        await updatePendingCount()

        // バックグラウンド同期を登録
        await serviceWorkerManager.registerSync('sync-ar-content')
      } catch (error) {
        console.error('Failed to save AR content offline:', error)
        throw error
      }
    },
    [updatePendingCount]
  )

  // マーカーをオフラインで保存
  const saveMarkerOffline = useCallback(
    async (marker: any) => {
      try {
        // IndexedDBに保存
        await offlineDB.save('markers', marker)

        // 同期待ちリストに追加
        await offlineDB.addPendingSync({
          type: 'marker',
          action: 'create',
          data: marker,
        })

        await updatePendingCount()

        // バックグラウンド同期を登録
        await serviceWorkerManager.registerSync('sync-ar-content')
      } catch (error) {
        console.error('Failed to save marker offline:', error)
        throw error
      }
    },
    [updatePendingCount]
  )

  // オフラインデータを取得
  const getOfflineData = useCallback(async (storeName: string) => {
    try {
      return await offlineDB.getAll(storeName)
    } catch (error) {
      console.error('Failed to get offline data:', error)
      return []
    }
  }, [])

  // キャッシュデータを取得
  const getCachedData = useCallback(async (key: string) => {
    try {
      return await offlineDB.getCachedData(key)
    } catch (error) {
      console.error('Failed to get cached data:', error)
      return null
    }
  }, [])

  // データをキャッシュ
  const cacheData = useCallback(async (key: string, data: any, ttl?: number) => {
    try {
      await offlineDB.cacheData(key, data, ttl)
    } catch (error) {
      console.error('Failed to cache data:', error)
    }
  }, [])

  // 保留中のデータをクリア
  const clearPendingSync = useCallback(async () => {
    try {
      await offlineDB.clear('pending_sync')
      await updatePendingCount()
    } catch (error) {
      console.error('Failed to clear pending sync:', error)
    }
  }, [updatePendingCount])

  // オンライン復帰時の自動同期
  useEffect(() => {
    const handleOnline = () => {
      console.log('Back online, starting sync...')
      if (autoSync) {
        syncNow()
      }
    }

    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [autoSync, syncNow])

  // 定期的な同期
  useEffect(() => {
    if (!autoSync || !navigator.onLine) return

    const intervalId = setInterval(() => {
      if (navigator.onLine && pendingCount > 0) {
        syncNow()
      }
    }, syncInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [autoSync, syncInterval, pendingCount, syncNow])

  // 初期化
  useEffect(() => {
    updatePendingCount()

    // 期限切れキャッシュのクリーンアップ
    offlineDB.cleanupExpiredCache().catch(console.error)
  }, [updatePendingCount])

  return {
    // 状態
    isSyncing,
    pendingCount,
    lastSyncTime,

    // アクション
    syncNow,
    saveARContentOffline,
    saveMarkerOffline,
    getOfflineData,
    getCachedData,
    cacheData,
    clearPendingSync,
  }
}
