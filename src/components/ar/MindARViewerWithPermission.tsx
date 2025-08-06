'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useMindAR } from '@/hooks/useMindAR'
import { CameraPermission } from './CameraPermission'

interface MindARViewerWithPermissionProps {
  type: 'image' | 'face'
  targetUrl?: string
  onTargetFound?: () => void
  onTargetLost?: () => void
  autoStart?: boolean
  children?: React.ReactNode
}

export const MindARViewerWithPermission: React.FC<MindARViewerWithPermissionProps> = ({
  type,
  targetUrl,
  onTargetFound,
  onTargetLost,
  autoStart = false,
  children,
}) => {
  const [isStarted, setIsStarted] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const anchorRef = useRef<any>(null)

  const { containerRef, mindAR, isLoading, isReady, error, start, stop, addAnchor } = useMindAR({
    type,
    imageTargetSrc: targetUrl,
    maxTrack: 1,
  })

  // カメラパーミッションが許可されたときのハンドラ
  const handlePermissionGranted = () => {
    setHasPermission(true)
  }

  // AR体験を自動開始
  useEffect(() => {
    if (hasPermission && autoStart && isReady && !isStarted) {
      handleStart()
    }
  }, [hasPermission, autoStart, isReady, isStarted])

  useEffect(() => {
    if (!isReady || !mindAR) return

    const setupScene = () => {
      sceneRef.current = mindAR.scene

      const anchor = addAnchor(0)
      if (anchor) {
        anchorRef.current = anchor

        // デフォルトの3Dキューブを追加
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
        const material = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          wireframe: true,
        })
        const cube = new THREE.Mesh(geometry, material)
        anchor.group.add(cube)

        // イベントハンドラの設定
        if (onTargetFound) {
          anchor.onTargetFound = onTargetFound
        }
        if (onTargetLost) {
          anchor.onTargetLost = onTargetLost
        }

        // アニメーションループ
        const clock = new THREE.Clock()
        const animate = () => {
          const delta = clock.getDelta()
          cube.rotation.x += delta
          cube.rotation.y += delta * 2
        }

        mindAR.renderer.setAnimationLoop(() => {
          animate()
          mindAR.renderer.render(mindAR.scene, mindAR.camera)
        })
      }
    }

    setupScene()

    return () => {
      if (mindAR && mindAR.renderer) {
        mindAR.renderer.setAnimationLoop(null)
      }
    }
  }, [isReady, mindAR, addAnchor, onTargetFound, onTargetLost])

  const handleStart = async () => {
    if (!isReady) return

    try {
      setIsStarted(true)
      await start()
    } catch (err) {
      console.error('Failed to start AR:', err)
      setIsStarted(false)
    }
  }

  const handleStop = () => {
    setIsStarted(false)
    stop()
  }

  // エラー表示
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">AR Error</h2>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <CameraPermission onPermissionGranted={handlePermissionGranted}>
      <div className="relative w-full h-screen bg-black">
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        />

        {/* ローディング表示 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-xl">Loading AR Experience...</p>
              <p className="text-gray-400 text-sm mt-2">Preparing camera and AR tracking...</p>
            </div>
          </div>
        )}

        {/* スタートボタン（自動開始でない場合） */}
        {isReady && !isStarted && !autoStart && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <svg
                    className="h-8 w-8 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Start AR</h3>
                <p className="text-gray-600 mb-6">
                  {type === 'image'
                    ? 'Point your camera at the target image to see AR content'
                    : 'Position your face in the camera view to start the AR experience'}
                </p>
                <button
                  onClick={handleStart}
                  className="w-full px-8 py-3 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg"
                >
                  Start AR Experience
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ストップボタン */}
        {isStarted && (
          <>
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg flex items-center space-x-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                  />
                </svg>
                <span>Stop AR</span>
              </button>
            </div>

            {/* 情報パネル */}
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">AR Tracking Active</p>
                    <p className="text-xs text-gray-600">
                      {type === 'image'
                        ? 'Point your camera at the target image'
                        : 'Keep your face in the camera view'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* デバッグ情報（開発時のみ表示） */}
        {process.env.NODE_ENV === 'development' && isStarted && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-black bg-opacity-75 text-white text-xs p-2 rounded font-mono">
              <div>Type: {type}</div>
              <div>Status: {isStarted ? 'Running' : 'Stopped'}</div>
              <div>Permission: {hasPermission ? 'Granted' : 'Pending'}</div>
            </div>
          </div>
        )}
      </div>
    </CameraPermission>
  )
}
