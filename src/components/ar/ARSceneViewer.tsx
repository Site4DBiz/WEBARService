'use client'

import { useEffect, useRef, useState } from 'react'
import { loadMindARScripts, unloadMindARScripts } from '@/lib/ar/mindar-loader'

interface ARSceneViewerProps {
  targetUrl?: string
  onTargetFound?: () => void
  onTargetLost?: () => void
  children?: React.ReactNode
}

export default function ARSceneViewer({
  targetUrl = '/targets/default-target.mind',
  onTargetFound,
  onTargetLost,
  children,
}: ARSceneViewerProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const initAR = async () => {
      try {
        await loadMindARScripts()

        if (!mounted) return

        const sceneHTML = `
          <a-scene
            mindar-image="imageTargetSrc: ${targetUrl}; showStats: false; uiScanning: #scanning; uiLoading: #loading;"
            color-space="sRGB"
            embedded
            renderer="colorManagement: true, physicallyCorrectLights"
            vr-mode-ui="enabled: false"
            device-orientation-permission-ui="enabled: false">
            
            <a-assets>
              <img id="loading" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" />
              <img id="scanning" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" />
            </a-assets>

            <a-camera position="0 0 0" look-controls="enabled: false" cursor="rayOrigin: mouse" raycaster="near: 10; far: 10000"></a-camera>

            <a-entity mindar-image-target="targetIndex: 0">
              ${children || '<a-box position="0 0 0" rotation="0 45 0" color="#4CC3D9"></a-box>'}
            </a-entity>
          </a-scene>
        `

        if (sceneRef.current) {
          sceneRef.current.innerHTML = sceneHTML
        }

        setIsLoading(false)

        const scene = document.querySelector('a-scene')
        if (scene) {
          scene.addEventListener('targetFound', () => {
            if (onTargetFound) onTargetFound()
          })
          scene.addEventListener('targetLost', () => {
            if (onTargetLost) onTargetLost()
          })
        }
      } catch (err) {
        console.error('Failed to initialize AR:', err)
        setError('AR初期化に失敗しました')
        setIsLoading(false)
      }
    }

    initAR()

    return () => {
      mounted = false
      const currentSceneRef = sceneRef.current
      if (currentSceneRef) {
        currentSceneRef.innerHTML = ''
      }
      unloadMindARScripts()
    }
  }, [targetUrl, onTargetFound, onTargetLost, children])

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-xl">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded bg-blue-500 px-4 py-2 hover:bg-blue-600"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p>ARを準備中...</p>
          </div>
        </div>
      )}
      <div ref={sceneRef} className="h-full w-full" />
    </div>
  )
}
