'use client'

import React, { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import {
  ImageTracker,
  ImageFeature,
  TrackingSettings,
  OptimizationResult,
} from '@/lib/ar/ImageTracker'
import { OptimizationConfig } from '@/lib/ar/TrackingOptimizer'

interface ImageTrackingSettingsProps {
  imageUrl?: string
  onSettingsChange?: (settings: TrackingSettings & OptimizationConfig) => void
  onImageOptimized?: (optimizedUrl: string) => void
}

export const ImageTrackingSettings: React.FC<ImageTrackingSettingsProps> = ({
  imageUrl,
  onSettingsChange,
  onImageOptimized,
}) => {
  const [imageTracker] = useState(() => new ImageTracker())
  const [imageFeatures, setImageFeatures] = useState<ImageFeature | null>(null)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [trackingSettings, setTrackingSettings] = useState<TrackingSettings>({
    filterMinCF: 0.0001,
    filterBeta: 1000,
    warmupTolerance: 5,
    missTolerance: 5,
    smoothingFactor: 0.5,
    adaptiveThreshold: false,
    enhanceContrast: false,
    edgeDetection: false,
  })

  const [optimizationConfig, setOptimizationConfig] = useState<OptimizationConfig>({
    enableSmoothing: true,
    smoothingFactor: 0.7,
    enablePrediction: true,
    predictionSteps: 3,
    enableOcclusionHandling: true,
    occlusionTimeout: 500,
    enableJitterReduction: true,
    jitterThreshold: 0.01,
  })

  // 画像分析
  const analyzeImage = useCallback(async () => {
    if (!imageUrl) return

    setIsAnalyzing(true)
    try {
      const features = await imageTracker.analyzeImage(imageUrl)
      setImageFeatures(features)

      const optimization = imageTracker.optimizeTrackingSettings(features)
      setOptimizationResult(optimization)

      // 推奨設定を適用
      if (optimization.optimizedSettings) {
        setTrackingSettings(optimization.optimizedSettings)
      }
    } catch (error) {
      console.error('画像分析エラー:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [imageUrl, imageTracker])

  // 画像の最適化
  const optimizeImage = useCallback(async () => {
    if (!imageUrl) return

    try {
      const optimizedUrl = await imageTracker.optimizeImage(imageUrl, trackingSettings)
      setPreviewUrl(optimizedUrl)
      onImageOptimized?.(optimizedUrl)
    } catch (error) {
      console.error('画像最適化エラー:', error)
    }
  }, [imageUrl, trackingSettings, imageTracker, onImageOptimized])

  // 設定が変更されたときの処理
  useEffect(() => {
    onSettingsChange?.({
      ...trackingSettings,
      ...optimizationConfig,
    })
  }, [trackingSettings, optimizationConfig, onSettingsChange])

  // 画像URLが変更されたときの処理
  useEffect(() => {
    if (imageUrl) {
      analyzeImage()
    }
  }, [imageUrl, analyzeImage])

  // クリーンアップ
  useEffect(() => {
    return () => {
      imageTracker.dispose()
    }
  }, [imageTracker])

  const getQualityColor = (value: number) => {
    if (value >= 70) return 'text-green-500'
    if (value >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getQualityBgColor = (value: number) => {
    if (value >= 70) return 'bg-green-500'
    if (value >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* 画像分析結果 */}
      {imageFeatures && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">画像分析結果</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-400">特徴点数</label>
              <p className={`text-2xl font-bold ${getQualityColor(imageFeatures.points / 10)}`}>
                {imageFeatures.points}
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-400">画像品質</label>
              <p className={`text-2xl font-bold ${getQualityColor(imageFeatures.quality)}`}>
                {imageFeatures.quality.toFixed(1)}%
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-400">コントラスト</label>
              <p className={`text-2xl font-bold ${getQualityColor(imageFeatures.contrast)}`}>
                {imageFeatures.contrast.toFixed(1)}%
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-400">ユニークネス</label>
              <p className={`text-2xl font-bold ${getQualityColor(imageFeatures.uniqueness)}`}>
                {imageFeatures.uniqueness.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-gray-400">トラッキング可能性</label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full ${getQualityBgColor(imageFeatures.trackability)} transition-all duration-500`}
                  style={{ width: `${imageFeatures.trackability}%` }}
                />
              </div>
              <span className={`text-lg font-bold ${getQualityColor(imageFeatures.trackability)}`}>
                {imageFeatures.trackability.toFixed(1)}%
              </span>
            </div>
          </div>

          {optimizationResult && optimizationResult.recommendations.length > 0 && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-2">推奨事項</h4>
              <ul className="space-y-1">
                {optimizationResult.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start">
                    <span className="text-yellow-500 mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* トラッキング設定 */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">トラッキング設定</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              最小信頼度フィルタ (Filter Min CF)
            </label>
            <input
              type="range"
              min="0.00001"
              max="0.01"
              step="0.00001"
              value={trackingSettings.filterMinCF}
              onChange={(e) =>
                setTrackingSettings({
                  ...trackingSettings,
                  filterMinCF: parseFloat(e.target.value),
                })
              }
              className="w-full"
            />
            <span className="text-sm text-gray-400">{trackingSettings.filterMinCF.toFixed(5)}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              フィルタベータ (Filter Beta)
            </label>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={trackingSettings.filterBeta}
              onChange={(e) =>
                setTrackingSettings({
                  ...trackingSettings,
                  filterBeta: parseInt(e.target.value),
                })
              }
              className="w-full"
            />
            <span className="text-sm text-gray-400">{trackingSettings.filterBeta}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ウォームアップ許容度
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={trackingSettings.warmupTolerance}
              onChange={(e) =>
                setTrackingSettings({
                  ...trackingSettings,
                  warmupTolerance: parseInt(e.target.value),
                })
              }
              className="w-full"
            />
            <span className="text-sm text-gray-400">{trackingSettings.warmupTolerance}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">ミス許容度</label>
            <input
              type="range"
              min="1"
              max="20"
              value={trackingSettings.missTolerance}
              onChange={(e) =>
                setTrackingSettings({
                  ...trackingSettings,
                  missTolerance: parseInt(e.target.value),
                })
              }
              className="w-full"
            />
            <span className="text-sm text-gray-400">{trackingSettings.missTolerance}</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={trackingSettings.adaptiveThreshold}
                onChange={(e) =>
                  setTrackingSettings({
                    ...trackingSettings,
                    adaptiveThreshold: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">適応的しきい値</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={trackingSettings.enhanceContrast}
                onChange={(e) =>
                  setTrackingSettings({
                    ...trackingSettings,
                    enhanceContrast: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">コントラスト強調</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={trackingSettings.edgeDetection}
                onChange={(e) =>
                  setTrackingSettings({
                    ...trackingSettings,
                    edgeDetection: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">エッジ検出</span>
            </label>
          </div>
        </div>
      </div>

      {/* 最適化設定 */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">最適化設定</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={optimizationConfig.enableSmoothing}
                onChange={(e) =>
                  setOptimizationConfig({
                    ...optimizationConfig,
                    enableSmoothing: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">スムージング</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={optimizationConfig.enablePrediction}
                onChange={(e) =>
                  setOptimizationConfig({
                    ...optimizationConfig,
                    enablePrediction: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">動き予測</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={optimizationConfig.enableOcclusionHandling}
                onChange={(e) =>
                  setOptimizationConfig({
                    ...optimizationConfig,
                    enableOcclusionHandling: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">オクルージョン対応</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={optimizationConfig.enableJitterReduction}
                onChange={(e) =>
                  setOptimizationConfig({
                    ...optimizationConfig,
                    enableJitterReduction: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">ジッター除去</span>
            </label>
          </div>

          {optimizationConfig.enableSmoothing && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                スムージング係数
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={optimizationConfig.smoothingFactor}
                onChange={(e) =>
                  setOptimizationConfig({
                    ...optimizationConfig,
                    smoothingFactor: parseFloat(e.target.value),
                  })
                }
                className="w-full"
              />
              <span className="text-sm text-gray-400">
                {optimizationConfig.smoothingFactor.toFixed(1)}
              </span>
            </div>
          )}

          {optimizationConfig.enablePrediction && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">予測ステップ数</label>
              <input
                type="range"
                min="1"
                max="10"
                value={optimizationConfig.predictionSteps}
                onChange={(e) =>
                  setOptimizationConfig({
                    ...optimizationConfig,
                    predictionSteps: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <span className="text-sm text-gray-400">{optimizationConfig.predictionSteps}</span>
            </div>
          )}

          {optimizationConfig.enableOcclusionHandling && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                オクルージョンタイムアウト (ms)
              </label>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={optimizationConfig.occlusionTimeout}
                onChange={(e) =>
                  setOptimizationConfig({
                    ...optimizationConfig,
                    occlusionTimeout: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <span className="text-sm text-gray-400">{optimizationConfig.occlusionTimeout}ms</span>
            </div>
          )}

          {optimizationConfig.enableJitterReduction && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ジッターしきい値
              </label>
              <input
                type="range"
                min="0.001"
                max="0.1"
                step="0.001"
                value={optimizationConfig.jitterThreshold}
                onChange={(e) =>
                  setOptimizationConfig({
                    ...optimizationConfig,
                    jitterThreshold: parseFloat(e.target.value),
                  })
                }
                className="w-full"
              />
              <span className="text-sm text-gray-400">
                {optimizationConfig.jitterThreshold.toFixed(3)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex space-x-4">
        <button
          onClick={analyzeImage}
          disabled={!imageUrl || isAnalyzing}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isAnalyzing ? '分析中...' : '画像を再分析'}
        </button>

        <button
          onClick={optimizeImage}
          disabled={!imageUrl}
          className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          画像を最適化
        </button>
      </div>

      {/* プレビュー */}
      {previewUrl && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">最適化済み画像プレビュー</h3>
          <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
            <Image
              src={previewUrl}
              alt="Optimized"
              fill
              className="rounded-lg object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </div>
  )
}
