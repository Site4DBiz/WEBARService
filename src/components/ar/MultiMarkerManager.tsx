'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { MarkerDetectionHandler, MarkerDetectionState } from './MarkerDetectionHandler'

export interface MarkerConfig {
  targetIndex: number
  name: string
  description?: string
  contentType?: 'model' | 'video' | 'image' | 'text'
  contentUrl?: string
}

export interface MultiMarkerManagerProps {
  anchors: any[]
  markerConfigs: MarkerConfig[]
  onMarkerDetected?: (marker: MarkerConfig, state: MarkerDetectionState) => void
  onMarkerLost?: (marker: MarkerConfig, state: MarkerDetectionState) => void
  onActiveMarkersChange?: (activeMarkers: MarkerConfig[]) => void
  debugMode?: boolean
  maxSimultaneous?: number
}

export const MultiMarkerManager: React.FC<MultiMarkerManagerProps> = ({
  anchors,
  markerConfigs,
  onMarkerDetected,
  onMarkerLost,
  onActiveMarkersChange,
  debugMode = false,
  maxSimultaneous = 5,
}) => {
  const [activeMarkers, setActiveMarkers] = useState<Set<number>>(new Set())
  const [markerStates, setMarkerStates] = useState<Map<number, MarkerDetectionState>>(new Map())

  // マーカー検出時のハンドラー
  const handleMarkerFound = useCallback(
    (markerConfig: MarkerConfig) => (state: MarkerDetectionState) => {
      setActiveMarkers((prev) => {
        const newSet = new Set(prev)

        // 最大同時検出数を超える場合は古いものを削除
        if (newSet.size >= maxSimultaneous && !newSet.has(markerConfig.targetIndex)) {
          const oldestMarker = Array.from(newSet)[0]
          newSet.delete(oldestMarker)
        }

        newSet.add(markerConfig.targetIndex)
        return newSet
      })

      setMarkerStates((prev) => {
        const newMap = new Map(prev)
        newMap.set(markerConfig.targetIndex, state)
        return newMap
      })

      onMarkerDetected?.(markerConfig, state)
    },
    [onMarkerDetected, maxSimultaneous]
  )

  // マーカーロスト時のハンドラー
  const handleMarkerLost = useCallback(
    (markerConfig: MarkerConfig) => (state: MarkerDetectionState) => {
      setActiveMarkers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(markerConfig.targetIndex)
        return newSet
      })

      setMarkerStates((prev) => {
        const newMap = new Map(prev)
        if (state.confidence === 0) {
          newMap.delete(markerConfig.targetIndex)
        } else {
          newMap.set(markerConfig.targetIndex, state)
        }
        return newMap
      })

      onMarkerLost?.(markerConfig, state)
    },
    [onMarkerLost]
  )

  // アクティブマーカーの変更を通知
  useEffect(() => {
    const activeMarkerConfigs = markerConfigs.filter((config) =>
      activeMarkers.has(config.targetIndex)
    )
    onActiveMarkersChange?.(activeMarkerConfigs)
  }, [activeMarkers, markerConfigs, onActiveMarkersChange])

  return (
    <>
      {/* 各マーカーの検出ハンドラー */}
      {markerConfigs.map((config, index) => {
        const anchor = anchors[index]
        if (!anchor) return null

        return (
          <MarkerDetectionHandler
            key={config.targetIndex}
            anchor={anchor}
            targetIndex={config.targetIndex}
            onTargetFound={handleMarkerFound(config)}
            onTargetLost={handleMarkerLost(config)}
            debugMode={debugMode}
          />
        )
      })}

      {/* マルチマーカー状態表示 */}
      {debugMode && (
        <div className="absolute top-20 right-4 z-20 bg-black bg-opacity-75 text-white text-xs p-3 rounded-lg font-mono max-w-xs">
          <h3 className="text-sm font-bold mb-2">Multi-Marker Status</h3>

          <div className="mb-2">
            <span className="text-green-400">
              Active Markers: {activeMarkers.size}/{maxSimultaneous}
            </span>
          </div>

          <div className="space-y-2">
            {markerConfigs.map((config) => {
              const isActive = activeMarkers.has(config.targetIndex)
              const state = markerStates.get(config.targetIndex)

              return (
                <div
                  key={config.targetIndex}
                  className={`p-2 rounded ${isActive ? 'bg-green-900' : 'bg-gray-800'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{config.name}</span>
                    <span className={isActive ? 'text-green-400' : 'text-gray-500'}>
                      {isActive ? '●' : '○'}
                    </span>
                  </div>
                  {state && (
                    <div className="text-xs mt-1 text-gray-300">
                      Confidence: {state.confidence.toFixed(0)}% | Count: {state.detectionCount}
                    </div>
                  )}
                  {config.description && (
                    <div className="text-xs mt-1 text-gray-400">{config.description}</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* パフォーマンス情報 */}
          <div className="mt-3 pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-400">
              Total Detected:{' '}
              {Array.from(markerStates.values()).reduce(
                (sum, state) => sum + state.detectionCount,
                0
              )}
            </div>
            <div className="text-xs text-gray-400">
              Avg Confidence:{' '}
              {markerStates.size > 0
                ? (
                    Array.from(markerStates.values()).reduce(
                      (sum, state) => sum + state.confidence,
                      0
                    ) / markerStates.size
                  ).toFixed(1)
                : 0}
              %
            </div>
          </div>
        </div>
      )}
    </>
  )
}
