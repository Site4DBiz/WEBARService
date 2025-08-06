'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'

export interface MarkerDetectionState {
  targetIndex: number
  isDetected: boolean
  lastDetectedAt: Date | null
  detectionCount: number
  confidence: number
}

export interface MarkerDetectionHandlerProps {
  anchor: any
  targetIndex: number
  onTargetFound?: (state: MarkerDetectionState) => void
  onTargetLost?: (state: MarkerDetectionState) => void
  onConfidenceChange?: (confidence: number) => void
  debugMode?: boolean
}

export const MarkerDetectionHandler: React.FC<MarkerDetectionHandlerProps> = ({
  anchor,
  targetIndex,
  onTargetFound,
  onTargetLost,
  onConfidenceChange,
  debugMode = false,
}) => {
  const [detectionState, setDetectionState] = useState<MarkerDetectionState>({
    targetIndex,
    isDetected: false,
    lastDetectedAt: null,
    detectionCount: 0,
    confidence: 0,
  })

  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const confidenceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(performance.now())

  // マーカー検出時のハンドラー
  const handleTargetFound = useCallback(() => {
    const now = new Date()

    setDetectionState((prev) => {
      const newState: MarkerDetectionState = {
        ...prev,
        isDetected: true,
        lastDetectedAt: now,
        detectionCount: prev.detectionCount + 1,
        confidence: Math.min(100, prev.confidence + 20),
      }

      if (debugMode) {
        console.log('[MarkerDetection] Target Found:', {
          targetIndex,
          detectionCount: newState.detectionCount,
          confidence: newState.confidence,
        })
      }

      onTargetFound?.(newState)
      return newState
    })

    // 検出タイムアウトをリセット
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current)
    }

    // 一定時間検出されない場合はロストとみなす
    detectionTimeoutRef.current = setTimeout(() => {
      handleTargetLost()
    }, 3000)
  }, [targetIndex, onTargetFound, debugMode])

  // マーカーロスト時のハンドラー
  const handleTargetLost = useCallback(() => {
    setDetectionState((prev) => {
      const newState: MarkerDetectionState = {
        ...prev,
        isDetected: false,
        confidence: Math.max(0, prev.confidence - 30),
      }

      if (debugMode) {
        console.log('[MarkerDetection] Target Lost:', {
          targetIndex,
          lastDetectedAt: prev.lastDetectedAt,
          confidence: newState.confidence,
        })
      }

      onTargetLost?.(newState)
      return newState
    })

    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current)
      detectionTimeoutRef.current = null
    }
  }, [targetIndex, onTargetLost, debugMode])

  // 信頼度の更新
  const updateConfidence = useCallback(() => {
    setDetectionState((prev) => {
      let newConfidence = prev.confidence

      if (prev.isDetected) {
        // 検出中は徐々に信頼度を上げる
        newConfidence = Math.min(100, prev.confidence + 2)
      } else {
        // 未検出時は徐々に信頼度を下げる
        newConfidence = Math.max(0, prev.confidence - 5)
      }

      if (newConfidence !== prev.confidence) {
        onConfidenceChange?.(newConfidence)
      }

      return {
        ...prev,
        confidence: newConfidence,
      }
    })
  }, [onConfidenceChange])

  // FPS計算（デバッグ用）
  const calculateFPS = useCallback(() => {
    const now = performance.now()
    const delta = now - lastFrameTimeRef.current
    frameCountRef.current++

    if (delta >= 1000) {
      const fps = (frameCountRef.current * 1000) / delta
      if (debugMode) {
        console.log(`[MarkerDetection] FPS: ${fps.toFixed(2)}`)
      }
      frameCountRef.current = 0
      lastFrameTimeRef.current = now
    }
  }, [debugMode])

  // アンカーにイベントハンドラーを設定
  useEffect(() => {
    if (!anchor) return

    // イベントハンドラーの設定
    anchor.onTargetFound = handleTargetFound
    anchor.onTargetLost = handleTargetLost

    // 信頼度更新インターバル
    confidenceIntervalRef.current = setInterval(updateConfidence, 100)

    // デバッグモードでFPS計算
    if (debugMode) {
      const fpsInterval = setInterval(calculateFPS, 16)
      return () => {
        clearInterval(fpsInterval)
        if (confidenceIntervalRef.current) {
          clearInterval(confidenceIntervalRef.current)
        }
      }
    }

    return () => {
      if (confidenceIntervalRef.current) {
        clearInterval(confidenceIntervalRef.current)
      }
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current)
      }
    }
  }, [anchor, handleTargetFound, handleTargetLost, updateConfidence, calculateFPS, debugMode])

  // デバッグ情報の表示
  if (debugMode) {
    return (
      <div className="absolute top-20 left-4 z-20 bg-black bg-opacity-75 text-white text-xs p-3 rounded-lg font-mono">
        <h3 className="text-sm font-bold mb-2">Marker Detection Debug</h3>
        <div className="space-y-1">
          <div>Target Index: {targetIndex}</div>
          <div>Status: {detectionState.isDetected ? '✅ Detected' : '❌ Not Detected'}</div>
          <div>Detection Count: {detectionState.detectionCount}</div>
          <div>Confidence: {detectionState.confidence.toFixed(1)}%</div>
          <div>
            Last Detected:{' '}
            {detectionState.lastDetectedAt
              ? detectionState.lastDetectedAt.toLocaleTimeString()
              : 'Never'}
          </div>
        </div>

        {/* 信頼度バー */}
        <div className="mt-2">
          <div className="text-xs mb-1">Confidence Level:</div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                detectionState.confidence > 70
                  ? 'bg-green-500'
                  : detectionState.confidence > 30
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${detectionState.confidence}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return null
}
