'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // PWAがすでにインストールされているかチェック
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // iOSデバイスかチェック
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIOSDevice)

    // iOS Safari の場合、特別な処理
    if (isIOSDevice && 'standalone' in window.navigator) {
      // @ts-ignore
      const isInStandaloneMode = window.navigator.standalone
      if (!isInStandaloneMode) {
        // インストールされていない場合、24時間に1回プロンプトを表示
        const lastPromptTime = localStorage.getItem('pwa-install-prompt-time')
        const now = Date.now()
        if (!lastPromptTime || now - parseInt(lastPromptTime) > 24 * 60 * 60 * 1000) {
          setTimeout(() => {
            setShowInstallPrompt(true)
            localStorage.setItem('pwa-install-prompt-time', now.toString())
          }, 3000)
        }
      }
      return
    }

    // Android/Desktop Chrome の場合
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // 初回訪問から3秒後にプロンプトを表示
      const hasShownPrompt = sessionStorage.getItem('pwa-install-prompt-shown')
      if (!hasShownPrompt) {
        setTimeout(() => {
          setShowInstallPrompt(true)
          sessionStorage.setItem('pwa-install-prompt-shown', 'true')
        }, 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // アプリがインストールされた時のイベント
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      console.log('PWA was installed')
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('No deferred prompt available')
      return
    }

    // インストールプロンプトを表示
    await deferredPrompt.prompt()

    // ユーザーの選択を待つ
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to the install prompt: ${outcome}`)

    // プロンプトをリセット
    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleClosePrompt = () => {
    setShowInstallPrompt(false)
    // 7日間は再表示しない
    const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000
    localStorage.setItem('pwa-install-prompt-dismissed', sevenDaysFromNow.toString())
  }

  // インストール済みまたはプロンプトを表示しない場合
  if (isInstalled || !showInstallPrompt) {
    return null
  }

  // iOS用のインストール案内
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg z-50 animate-slide-up">
        <div className="max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Image
                src="/icon-96x96.png"
                alt="WebAR Service"
                width={48}
                height={48}
                className="rounded-lg"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                WebAR Serviceをインストール
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                ホーム画面に追加してアプリとして使用できます
              </p>
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326"
                  />
                </svg>
                <span>共有ボタン</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span>「ホーム画面に追加」をタップ</span>
              </div>
            </div>
            <button
              onClick={handleClosePrompt}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="閉じる"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Android/Desktop Chrome用のインストールプロンプト
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Image
            src="/icon-96x96.png"
            alt="WebAR Service"
            width={48}
            height={48}
            className="rounded-lg"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            WebAR Serviceをインストール
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            ホーム画面に追加してオフラインでも使用できます
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              インストール
            </button>
            <button
              onClick={handleClosePrompt}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              後で
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// アニメーション用のスタイル
const styles = `
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out forwards;
}
`

// スタイルを追加
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.innerHTML = styles
  document.head.appendChild(styleElement)
}
