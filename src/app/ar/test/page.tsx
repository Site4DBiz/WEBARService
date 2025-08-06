'use client'

import React, { useState } from 'react'
import { ARSceneComponent } from '@/components/ar/ARSceneComponent'
import { MindARViewerWithPermission } from '@/components/ar/MindARViewerWithPermission'

export default function ARTestPage() {
  const [testMode, setTestMode] = useState<'basic' | 'advanced'>('basic')
  const [targetFound, setTargetFound] = useState(false)

  const handleTargetFound = (targetIndex: number) => {
    console.log('Target found:', targetIndex)
    setTargetFound(true)
  }

  const handleTargetLost = (targetIndex: number) => {
    console.log('Target lost:', targetIndex)
    setTargetFound(false)
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
          <h1 className="text-xl font-bold text-gray-900 mb-4">AR Camera Permission Test</h1>

          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setTestMode('basic')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                testMode === 'basic'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Basic AR Viewer
            </button>
            <button
              onClick={() => setTestMode('advanced')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                testMode === 'advanced'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Advanced AR Scene
            </button>
          </div>

          {/* ステータス表示 */}
          <div className="flex items-center space-x-2">
            <div
              className={`h-3 w-3 rounded-full ${targetFound ? 'bg-green-500' : 'bg-gray-400'}`}
            ></div>
            <span className="text-sm text-gray-600">
              Target Status: {targetFound ? 'Detected' : 'Not Detected'}
            </span>
          </div>

          {/* 使用方法 */}
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-1">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click &quot;Enable Camera Access&quot; when prompted</li>
              <li>Allow camera permissions in your browser</li>
              <li>Click &quot;Start AR Experience&quot;</li>
              <li>Point your camera at a target image</li>
            </ol>
          </div>
        </div>
      </div>

      {/* ARコンポーネント */}
      <div className="absolute inset-0">
        {testMode === 'basic' ? (
          <MindARViewerWithPermission
            type="image"
            targetUrl="/targets/default.mind"
            onTargetFound={() => handleTargetFound(0)}
            onTargetLost={() => handleTargetLost(0)}
            autoStart={false}
          />
        ) : (
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
      </div>
    </div>
  )
}
