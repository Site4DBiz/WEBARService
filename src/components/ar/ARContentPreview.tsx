'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Camera, Maximize, Minimize, RotateCw, Play, Pause, Info } from 'lucide-react'
import dynamic from 'next/dynamic'

const EnhancedMindARViewer = dynamic(() => import('./EnhancedMindARViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-900">
      <div className="text-white text-center">
        <Camera className="h-12 w-12 mx-auto mb-4 animate-pulse" />
        <p>ARビューアーを読み込み中...</p>
      </div>
    </div>
  ),
})

const ModelViewer = dynamic(() => import('../3d/ModelViewer'), {
  ssr: false,
})

interface ARContentPreviewProps {
  markerUrl?: string
  modelUrl?: string
  modelSettings?: {
    scale: number
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number }
    enableAnimation: boolean
    enableInteraction: boolean
  }
  markerName?: string
  mode?: 'ar' | 'model' | 'both'
}

export function ARContentPreview({
  markerUrl,
  modelUrl,
  modelSettings = {
    scale: 1,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    enableAnimation: true,
    enableInteraction: true,
  },
  markerName = 'ARマーカー',
  mode = 'both',
}: ARContentPreviewProps) {
  const [viewMode, setViewMode] = useState<'ar' | 'model'>('model')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showInfo, setShowInfo] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const canShowAR = mode === 'ar' || mode === 'both'
  const canShowModel = (mode === 'model' || mode === 'both') && modelUrl

  useEffect(() => {
    if (mode === 'ar' && !canShowModel) {
      setViewMode('ar')
    } else if (mode === 'model' || !canShowAR) {
      setViewMode('model')
    }
  }, [mode, canShowAR, canShowModel])

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen()
      } else if ((containerRef.current as any).mozRequestFullScreen) {
        (containerRef.current as any).mozRequestFullScreen()
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen()
      }
      setIsFullscreen(false)
    }
  }

  const handleReset = () => {
    // リセット処理（将来的に実装）
    console.log('Reset preview')
  }

  return (
    <div
      ref={containerRef}
      className={`relative bg-gray-900 rounded-lg overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-[600px]'
      }`}
    >
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-white font-semibold">{markerName}</h3>
            {mode === 'both' && (
              <div className="flex bg-black/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('model')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'model'
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  3Dモデル
                </button>
                <button
                  onClick={() => setViewMode('ar')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'ar'
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  ARビュー
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 bg-black/50 rounded-lg text-white hover:bg-black/70 transition-colors"
              title="情報を表示"
            >
              <Info className="h-5 w-5" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 bg-black/50 rounded-lg text-white hover:bg-black/70 transition-colors"
              title="リセット"
            >
              <RotateCw className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-black/50 rounded-lg text-white hover:bg-black/70 transition-colors"
              title={isPlaying ? '一時停止' : '再生'}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-black/50 rounded-lg text-white hover:bg-black/70 transition-colors"
              title={isFullscreen ? '全画面を終了' : '全画面表示'}
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 情報パネル */}
      {showInfo && (
        <div className="absolute top-20 left-4 bg-black/80 text-white p-4 rounded-lg max-w-sm z-10">
          <h4 className="font-semibold mb-2">プレビュー情報</h4>
          <div className="space-y-1 text-sm">
            <p>モード: {viewMode === 'ar' ? 'ARビュー' : '3Dモデル'}</p>
            {modelSettings && (
              <>
                <p>スケール: {modelSettings.scale}</p>
                <p>
                  位置: X:{modelSettings.position.x}, Y:{modelSettings.position.y}, Z:
                  {modelSettings.position.z}
                </p>
                <p>
                  回転: X:{modelSettings.rotation.x}°, Y:{modelSettings.rotation.y}°, Z:
                  {modelSettings.rotation.z}°
                </p>
                <p>アニメーション: {modelSettings.enableAnimation ? '有効' : '無効'}</p>
                <p>インタラクション: {modelSettings.enableInteraction ? '有効' : '無効'}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="w-full h-full">
        {viewMode === 'ar' && markerUrl ? (
          <EnhancedMindARViewer
            markerUrl={markerUrl}
            modelUrl={modelUrl}
            modelConfig={{
              scale: modelSettings.scale,
              position: modelSettings.position,
              rotation: modelSettings.rotation,
            }}
            debugMode={false}
          />
        ) : viewMode === 'model' && modelUrl ? (
          <ModelViewer
            modelUrl={modelUrl}
            scale={modelSettings.scale}
            position={modelSettings.position}
            rotation={modelSettings.rotation}
            enableAnimation={modelSettings.enableAnimation && isPlaying}
            enableInteraction={modelSettings.enableInteraction}
            backgroundColor="#1f2937"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white">
            <div className="text-center">
              <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-xl">プレビューするコンテンツがありません</p>
              <p className="text-sm opacity-70 mt-2">
                {!markerUrl && !modelUrl
                  ? 'マーカーと3Dモデルをアップロードしてください'
                  : !markerUrl
                    ? 'マーカーをアップロードしてください'
                    : '3Dモデルをアップロードしてください'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* コントロール説明 */}
      {viewMode === 'model' && modelUrl && (
        <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs p-3 rounded-lg max-w-xs">
          <p className="font-semibold mb-1">操作方法:</p>
          <ul className="space-y-0.5">
            <li>• 左クリック + ドラッグ: 回転</li>
            <li>• 右クリック + ドラッグ: 移動</li>
            <li>• スクロール: ズーム</li>
          </ul>
        </div>
      )}

      {viewMode === 'ar' && markerUrl && (
        <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs p-3 rounded-lg max-w-xs">
          <p className="font-semibold mb-1">ARビューの使い方:</p>
          <ul className="space-y-0.5">
            <li>• カメラへのアクセスを許可してください</li>
            <li>• マーカー画像をカメラに向けてください</li>
            <li>• マーカーが検出されると3Dコンテンツが表示されます</li>
          </ul>
        </div>
      )}
    </div>
  )
}