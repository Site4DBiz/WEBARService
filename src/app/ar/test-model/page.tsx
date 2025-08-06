'use client'

import React, { useState } from 'react'
import { EnhancedMindARViewer } from '@/components/ar/EnhancedMindARViewer'
import { ModelConfig } from '@/components/ar/ModelLoader'
import { ARContent } from '@/components/ar/EnhancedMindARViewer'

const sampleModels = [
  {
    name: 'Basic Cube',
    content: { type: 'basic-cube', color: 0x00ff00 } as ARContent,
  },
  {
    name: 'Basic Sphere',
    content: { type: 'basic-sphere', color: 0xff0000 } as ARContent,
  },
  {
    name: 'Particle System',
    content: { type: 'particle', particleCount: 1000 } as ARContent,
  },
  {
    name: 'Text Display',
    content: { type: 'text', text: 'Hello AR!' } as ARContent,
  },
  {
    name: 'Custom GLTF Model',
    content: {
      type: 'custom-model',
      modelConfig: {
        url: 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
        scale: 0.5,
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        animation: false,
        useDraco: false,
      } as ModelConfig,
    } as ARContent,
  },
  {
    name: 'Animated Robot',
    content: {
      type: 'custom-model',
      modelConfig: {
        url: 'https://threejs.org/examples/models/gltf/RobotExpressive/glTF/RobotExpressive.gltf',
        scale: 0.3,
        position: [0, -0.1, 0] as [number, number, number],
        animation: true,
      } as ModelConfig,
    } as ARContent,
  },
]

export default function TestModelPage() {
  const [selectedModel, setSelectedModel] = useState(0)
  const [showViewer, setShowViewer] = useState(false)
  const [debugMode, setDebugMode] = useState(true)
  const [showStats, setShowStats] = useState(true)

  return (
    <div className="min-h-screen bg-gray-900">
      {!showViewer ? (
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">3D Model Loading Test</h1>

          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold text-white mb-4">Select a Model</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sampleModels.map((model, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedModel(index)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedModel === index
                        ? 'border-blue-500 bg-blue-500 bg-opacity-20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-white font-semibold">{model.name}</div>
                    <div className="text-gray-400 text-sm mt-1">Type: {model.content.type}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold text-white mb-4">Settings</h2>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-white">Enable Debug Mode</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={showStats}
                    onChange={(e) => setShowStats(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-white">Show Stats</span>
                </label>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-white mb-4">Selected Model Details</h2>
              <div className="bg-gray-700 rounded p-4">
                <pre className="text-green-400 text-sm overflow-x-auto">
                  {JSON.stringify(sampleModels[selectedModel], null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => setShowViewer(true)}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-2xl"
              >
                Start AR Experience
              </button>
            </div>

            <div className="mt-8 bg-yellow-800 bg-opacity-50 rounded-lg p-4">
              <h3 className="text-yellow-400 font-semibold mb-2">📌 Test Instructions</h3>
              <ul className="text-gray-300 space-y-1 text-sm">
                <li>• Select a model from the options above</li>
                <li>• Click &quot;Start AR Experience&quot; to begin</li>
                <li>• Allow camera permissions when prompted</li>
                <li>• Point your camera at the target marker</li>
                <li>• The selected 3D model will appear when the marker is detected</li>
                <li>• Use the default marker from: /public/markers/default-marker.jpg</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <EnhancedMindARViewer
          type="image"
          targetUrl="/markers/default-marker.mind"
          content={sampleModels[selectedModel].content}
          onTargetFound={() => console.log('Target found!')}
          onTargetLost={() => console.log('Target lost!')}
          showStats={showStats}
          enableLighting={true}
          debugMode={debugMode}
        />
      )}
    </div>
  )
}
