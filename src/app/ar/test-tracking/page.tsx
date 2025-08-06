'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ImageTracker } from '@/lib/ar/ImageTracker'
import { TrackingOptimizer, TrackingState } from '@/lib/ar/TrackingOptimizer'
import * as THREE from 'three'

const EnhancedMindARViewer = dynamic(
  () => import('@/components/ar/EnhancedMindARViewer').then(mod => ({ default: mod.EnhancedMindARViewer })),
  { ssr: false }
)

const ImageTrackingSettings = dynamic(
  () => import('@/components/ar/ImageTrackingSettings').then(mod => ({ default: mod.ImageTrackingSettings })),
  { ssr: false }
)

export default function TestTrackingPage() {
  const [imageUrl, setImageUrl] = useState<string>('/test-marker.jpg')
  const [optimizedImageUrl, setOptimizedImageUrl] = useState<string | null>(null)
  const [trackingOptimizer] = useState(() => new TrackingOptimizer())
  const [trackingMetrics, setTrackingMetrics] = useState<any>(null)
  const [trackingSettings, setTrackingSettings] = useState<any>(null)
  const [showAR, setShowAR] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  
  // ファイルアップロード処理
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setUploadedImage(url)
      setImageUrl(url)
    }
  }
  
  // トラッキング状態の更新処理
  const handleTargetFound = () => {
    console.log('Target Found')
    
    // トラッキング状態を作成
    const state: TrackingState = {
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      scale: new THREE.Vector3(1, 1, 1),
      confidence: 0.9,
      timestamp: Date.now(),
      isVisible: true
    }
    
    // 最適化処理
    const optimizedState = trackingOptimizer.updateTracking(state, null)
    
    // メトリクスの更新
    const metrics = trackingOptimizer.getMetrics()
    setTrackingMetrics(metrics)
  }
  
  const handleTargetLost = () => {
    console.log('Target Lost')
    
    const state: TrackingState = {
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      scale: new THREE.Vector3(1, 1, 1),
      confidence: 0,
      timestamp: Date.now(),
      isVisible: false
    }
    
    trackingOptimizer.updateTracking(state, null)
    
    const metrics = trackingOptimizer.getMetrics()
    setTrackingMetrics(metrics)
  }
  
  // クリーンアップ
  useEffect(() => {
    return () => {
      if (uploadedImage) {
        URL.revokeObjectURL(uploadedImage)
      }
      trackingOptimizer.dispose()
    }
  }, [uploadedImage, trackingOptimizer])
  
  return (
    <div className="min-h-screen bg-gray-900">
      {!showAR ? (
        <div className="container mx-auto py-8 px-4">
          <h1 className="text-3xl font-bold text-white mb-8">画像トラッキング最適化テスト</h1>
          
          {/* 画像アップロード */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">マーカー画像の選択</h2>
            
            <div className="mb-4">
              <label className="block">
                <span className="sr-only">画像を選択</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-600 file:text-white
                    hover:file:bg-blue-700"
                />
              </label>
            </div>
            
            {uploadedImage && (
              <div className="mt-4">
                <img
                  src={uploadedImage}
                  alt="Uploaded marker"
                  className="max-w-md rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>
          
          {/* トラッキング設定 */}
          {uploadedImage && (
            <div className="mb-8">
              <ImageTrackingSettings
                imageUrl={uploadedImage}
                onSettingsChange={setTrackingSettings}
                onImageOptimized={setOptimizedImageUrl}
              />
            </div>
          )}
          
          {/* メトリクス表示 */}
          {trackingMetrics && (
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">トラッキングメトリクス</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-400">安定性</p>
                  <p className="text-2xl font-bold text-white">
                    {trackingMetrics.stability.toFixed(1)}%
                  </p>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-400">精度</p>
                  <p className="text-2xl font-bold text-white">
                    {trackingMetrics.accuracy.toFixed(1)}%
                  </p>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-400">レイテンシ</p>
                  <p className="text-2xl font-bold text-white">
                    {trackingMetrics.latency.toFixed(0)}ms
                  </p>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-400">ロストフレーム</p>
                  <p className="text-2xl font-bold text-white">
                    {trackingMetrics.lostFrames}/{trackingMetrics.totalFrames}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* ARビューアー起動ボタン */}
          {uploadedImage && (
            <div className="text-center">
              <button
                onClick={() => setShowAR(true)}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-2xl"
              >
                ARトラッキングを開始
              </button>
            </div>
          )}
          
          {/* デフォルトマーカーを使用 */}
          {!uploadedImage && (
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400 mb-4">
                マーカー画像をアップロードするか、デフォルトのテストマーカーを使用してください。
              </p>
              <button
                onClick={() => {
                  setImageUrl('/test-marker.jpg')
                  setUploadedImage('/test-marker.jpg')
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                デフォルトマーカーを使用
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-screen">
          <EnhancedMindARViewer
            type="image"
            targetUrl={optimizedImageUrl || uploadedImage || imageUrl}
            content={{ type: 'basic-cube', color: 0x00ff00 }}
            onTargetFound={handleTargetFound}
            onTargetLost={handleTargetLost}
            showStats={true}
            debugMode={true}
          />
          
          {/* メトリクスオーバーレイ */}
          {trackingMetrics && (
            <div className="absolute top-20 left-4 bg-black bg-opacity-70 rounded-lg p-4 text-white">
              <h3 className="text-sm font-semibold mb-2">リアルタイムメトリクス</h3>
              <div className="text-xs space-y-1">
                <p>安定性: {trackingMetrics.stability.toFixed(1)}%</p>
                <p>精度: {trackingMetrics.accuracy.toFixed(1)}%</p>
                <p>レイテンシ: {trackingMetrics.latency.toFixed(0)}ms</p>
                <p>フレーム: {trackingMetrics.totalFrames}</p>
              </div>
            </div>
          )}
          
          {/* 戻るボタン */}
          <button
            onClick={() => setShowAR(false)}
            className="absolute bottom-4 left-4 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-lg"
          >
            設定に戻る
          </button>
        </div>
      )}
    </div>
  )
}