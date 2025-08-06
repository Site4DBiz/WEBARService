'use client'

import React, { useState } from 'react'
import { ARSceneComponent } from '@/components/ar/ARSceneComponent'
import { MindARViewerWithPermission } from '@/components/ar/MindARViewerWithPermission'
import { EnhancedMindARViewer } from '@/components/ar/EnhancedMindARViewer'
import { MarkerConfig } from '@/components/ar/MultiMarkerManager'
import { MarkerDetectionState } from '@/components/ar/MarkerDetectionHandler'

export default function ARTestPage() {
  const [testMode, setTestMode] = useState<'basic' | 'advanced' | 'enhanced'>('enhanced')
  const [targetFound, setTargetFound] = useState(false)
  const [debugMode, setDebugMode] = useState(true)
  const [multiMarkerMode, setMultiMarkerMode] = useState(false)
  const [detectionLog, setDetectionLog] = useState<string[]>([])

  // サンプルマーカー設定
  const markerConfigs: MarkerConfig[] = [
    {
      targetIndex: 0,
      name: 'Primary Marker',
      description: 'Main AR content marker',
      contentType: 'model',
    },
    {
      targetIndex: 1,
      name: 'Secondary Marker',
      description: 'Additional AR content',
      contentType: 'video',
    },
  ]

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDetectionLog((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)])
  }

  const handleTargetFound = (targetIndex: number) => {
    console.log('Target found:', targetIndex)
    setTargetFound(true)
    addLog(`Target ${targetIndex} found`)
  }

  const handleTargetLost = (targetIndex: number) => {
    console.log('Target lost:', targetIndex)
    setTargetFound(false)
    addLog(`Target ${targetIndex} lost`)
  }

  const handleEnhancedTargetFound = (state?: MarkerDetectionState) => {
    setTargetFound(true)
    const message = state
      ? `Target ${state.targetIndex} found - Confidence: ${state.confidence.toFixed(1)}%`
      : 'Target found'
    addLog(message)
  }

  const handleEnhancedTargetLost = (state?: MarkerDetectionState) => {
    setTargetFound(false)
    const message = state
      ? `Target ${state.targetIndex} lost - Confidence: ${state.confidence.toFixed(1)}%`
      : 'Target lost'
    addLog(message)
  }

  const handleMarkerDetected = (marker: MarkerConfig, state: MarkerDetectionState) => {
    addLog(`${marker.name} detected - Confidence: ${state.confidence.toFixed(1)}%`)
  }

  const handleMarkerLost = (marker: MarkerConfig, state: MarkerDetectionState) => {
    addLog(`${marker.name} lost - Count: ${state.detectionCount}`)
  }

  const advancedContents = [
    {
      type: 'primitive' as const,
      primitiveType: 'box' as const,
      color: '#ff0000',
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      animation: {
        type: 'rotate' as const,
        axis: 'y' as const,
        speed: 1,
      },
    },
    {
      type: 'primitive' as const,
      primitiveType: 'sphere' as const,
      color: '#0000ff',
      position: { x: 0.3, y: 0, z: 0 },
      scale: { x: 0.5, y: 0.5, z: 0.5 },
      animation: {
        type: 'bounce' as const,
        speed: 2,
      },
    },
    {
      type: 'text' as const,
      text: 'AR Test',
      position: { x: 0, y: 0.3, z: 0 },
    },
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      {/* モード選択UI */}
      <div className="absolute top-4 left-4 right-4 z-50">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h1 className="text-xl font-bold text-gray-900 mb-4">AR Marker Detection Test</h1>

          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setTestMode('basic')}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                testMode === 'basic'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setTestMode('advanced')}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                testMode === 'advanced'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Advanced
            </button>
            <button
              onClick={() => setTestMode('enhanced')}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                testMode === 'enhanced'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Enhanced
            </button>
          </div>

          {/* Enhanced モードのオプション */}
          {testMode === 'enhanced' && (
            <div className="space-y-2 mb-4 p-3 bg-gray-100 rounded">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={(e) => setDebugMode(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Debug Mode</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={multiMarkerMode}
                  onChange={(e) => setMultiMarkerMode(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Multi-Marker Mode</span>
              </label>
            </div>
          )}

          {/* ステータス表示 */}
          <div className="flex items-center space-x-2">
            <div
              className={`h-3 w-3 rounded-full ${targetFound ? 'bg-green-500' : 'bg-gray-400'}`}
            ></div>
            <span className="text-sm text-gray-600">
              Target Status: {targetFound ? 'Detected' : 'Not Detected'}
            </span>
          </div>

          {/* 検出ログ */}
          {testMode === 'enhanced' && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-1">Detection Log:</h3>
              <div className="bg-gray-100 rounded p-2 h-24 overflow-y-auto text-xs font-mono">
                {detectionLog.length > 0 ? (
                  detectionLog.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No detections yet...</div>
                )}
              </div>
            </div>
          )}

          {/* 使用方法 */}
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-1">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click &quot;Enable Camera Access&quot; when prompted</li>
              <li>Allow camera permissions in your browser</li>
              <li>Click &quot;Start AR Experience&quot;</li>
              <li>Point your camera at a target image</li>
              {testMode === 'enhanced' && multiMarkerMode && (
                <li>Try detecting multiple markers simultaneously</li>
              )}
            </ol>
          </div>
        </div>
      </div>

      {/* ARコンポーネント */}
      <div className="absolute inset-0">
        {testMode === 'basic' && (
          <MindARViewerWithPermission
            type="image"
            targetUrl="/targets/default.mind"
            onTargetFound={() => handleTargetFound(0)}
            onTargetLost={() => handleTargetLost(0)}
            autoStart={false}
          />
        )}
        {testMode === 'advanced' && (
          <ARSceneComponent
            type="image"
            targetUrl="/targets/default.mind"
            contents={advancedContents}
            onTargetFound={handleTargetFound}
            onTargetLost={handleTargetLost}
            autoStart={false}
            showDebugInfo={true}
          />
        )}
        {testMode === 'enhanced' && (
          <EnhancedMindARViewer
            type="image"
            targetUrl="/targets/default.mind"
            markerConfigs={multiMarkerMode ? markerConfigs : []}
            onTargetFound={handleEnhancedTargetFound}
            onTargetLost={handleEnhancedTargetLost}
            onMarkerDetected={handleMarkerDetected}
            onMarkerLost={handleMarkerLost}
            showStats={true}
            enableLighting={true}
            debugMode={debugMode}
            multiMarkerMode={multiMarkerMode}
            content={{ type: 'basic-cube', color: 0x00ff00 }}
          />
        )}
      </div>
    </div>
  )
}
