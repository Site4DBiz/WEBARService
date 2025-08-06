'use client'

import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
import serviceWorkerManager from '@/lib/service-worker/register'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'

interface ServiceWorkerContextType {
  isOnline: boolean
  isUpdateAvailable: boolean
  updateServiceWorker: () => void
  clearCache: () => void
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType>({
  isOnline: true,
  isUpdateAvailable: false,
  updateServiceWorker: () => {},
  clearCache: () => {},
})

export const useServiceWorker = () => useContext(ServiceWorkerContext)

interface ServiceWorkerProviderProps {
  children: ReactNode
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const [showUpdateNotification, setShowUpdateNotification] = useState(false)

  useEffect(() => {
    // Service Workerを登録
    serviceWorkerManager.register({
      onUpdate: (registration) => {
        console.log('Service Worker update available')
        setIsUpdateAvailable(true)
        setShowUpdateNotification(true)
      },
      onSuccess: (registration) => {
        console.log('Service Worker ready')
      },
      onError: (error) => {
        console.error('Service Worker error:', error)
      },
      onOffline: () => {
        setIsOnline(false)
      },
      onOnline: () => {
        setIsOnline(true)
      },
    })

    // 初期のオンライン状態を設定
    setIsOnline(navigator.onLine)

    // ネットワーク状態の監視
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const updateServiceWorker = async () => {
    await serviceWorkerManager.skipWaiting()
    setIsUpdateAvailable(false)
    setShowUpdateNotification(false)
    window.location.reload()
  }

  const clearCache = async () => {
    await serviceWorkerManager.clearCache()
    console.log('Cache cleared')
  }

  return (
    <ServiceWorkerContext.Provider
      value={{
        isOnline,
        isUpdateAvailable,
        updateServiceWorker,
        clearCache,
      }}
    >
      {children}

      {/* PWAインストールプロンプト */}
      <PWAInstallPrompt />

      {/* オフライン通知 */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50">
          <div className="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center">
            <svg
              className="w-5 h-5 mr-3 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="font-medium">オフラインモード</p>
              <p className="text-sm text-gray-300">一部の機能が制限されています</p>
            </div>
          </div>
        </div>
      )}

      {/* アップデート通知 */}
      {showUpdateNotification && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50">
          <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 mr-3 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <div className="flex-1">
                <p className="font-medium">新しいバージョンが利用可能です</p>
                <p className="text-sm text-blue-100 mt-1">
                  アプリを更新して最新の機能を利用しましょう
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={updateServiceWorker}
                    className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
                  >
                    今すぐ更新
                  </button>
                  <button
                    onClick={() => setShowUpdateNotification(false)}
                    className="text-blue-100 hover:text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    後で
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ServiceWorkerContext.Provider>
  )
}
