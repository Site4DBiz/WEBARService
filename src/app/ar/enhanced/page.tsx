'use client'

import React, { useState } from 'react'
import {
  EnhancedMindARViewer,
  ARContent,
  ARContentType,
} from '@/components/ar/EnhancedMindARViewer'

const contentPresets: { [key: string]: ARContent } = {
  'basic-cube': {
    type: 'basic-cube',
    color: 0x00ff00,
  },
  'basic-sphere': {
    type: 'basic-sphere',
    color: 0xff0000,
  },
  particle: {
    type: 'particle',
    particleCount: 500,
  },
  text: {
    type: 'text',
    text: 'Hello AR!',
  },
}

export default function EnhancedARPage() {
  const [arType, setArType] = useState<'image' | 'face'>('face')
  const [contentType, setContentType] = useState<ARContentType>('basic-cube')
  const [showAR, setShowAR] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [enableLighting, setEnableLighting] = useState(true)
  const [targetStatus, setTargetStatus] = useState<string>('')

  const handleTargetFound = () => {
    setTargetStatus('Target detected! AR content displayed.')
  }

  const handleTargetLost = () => {
    setTargetStatus('Target lost. Searching...')
  }

  const handleBack = () => {
    setShowAR(false)
    setTargetStatus('')
  }

  if (showAR) {
    return (
      <>
        <EnhancedMindARViewer
          type={arType}
          targetUrl={arType === 'image' ? '/targets.mind' : undefined}
          content={contentPresets[contentType]}
          onTargetFound={handleTargetFound}
          onTargetLost={handleTargetLost}
          showStats={showStats}
          enableLighting={enableLighting}
        />
        <button
          onClick={handleBack}
          className="fixed top-4 left-4 z-50 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-lg"
        >
          ← Back
        </button>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Enhanced WebAR Experience
            </h1>
            <p className="text-xl text-gray-300">Advanced AR features with customizable content</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 border border-white border-opacity-20">
              <h2 className="text-2xl font-semibold mb-4 text-white">1. Choose Tracking Type</h2>

              <div className="space-y-3">
                <button
                  onClick={() => setArType('face')}
                  className={`w-full p-4 rounded-xl transition-all flex items-center space-x-4 ${
                    arType === 'face'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-white bg-opacity-10 text-gray-300 hover:bg-opacity-20'
                  }`}
                >
                  <span className="text-3xl">👤</span>
                  <div className="text-left">
                    <div className="font-semibold">Face Tracking</div>
                    <div className="text-sm opacity-80">Track facial features</div>
                  </div>
                </button>

                <button
                  onClick={() => setArType('image')}
                  className={`w-full p-4 rounded-xl transition-all flex items-center space-x-4 ${
                    arType === 'image'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-white bg-opacity-10 text-gray-300 hover:bg-opacity-20'
                  }`}
                >
                  <span className="text-3xl">🖼️</span>
                  <div className="text-left">
                    <div className="font-semibold">Image Tracking</div>
                    <div className="text-sm opacity-80">Scan target images</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 border border-white border-opacity-20">
              <h2 className="text-2xl font-semibold mb-4 text-white">2. Select AR Content</h2>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(contentPresets).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => setContentType(preset.type)}
                    className={`p-3 rounded-lg transition-all ${
                      contentType === preset.type
                        ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white'
                        : 'bg-white bg-opacity-10 text-gray-300 hover:bg-opacity-20'
                    }`}
                  >
                    <div className="text-lg">
                      {preset.type === 'basic-cube' && '🟩 Cube'}
                      {preset.type === 'basic-sphere' && '🔴 Sphere'}
                      {preset.type === 'particle' && '✨ Particles'}
                      {preset.type === 'text' && '📝 Text'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white border-opacity-20">
            <h2 className="text-2xl font-semibold mb-4 text-white">3. Configure Options</h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between text-white">
                <span>Show Statistics</span>
                <input
                  type="checkbox"
                  checked={showStats}
                  onChange={(e) => setShowStats(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </label>

              <label className="flex items-center justify-between text-white">
                <span>Enable Lighting</span>
                <input
                  type="checkbox"
                  checked={enableLighting}
                  onChange={(e) => setEnableLighting(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>
          </div>

          <div className="text-center mb-8">
            <button
              onClick={() => setShowAR(true)}
              className="px-12 py-5 bg-gradient-to-r from-green-600 to-teal-600 text-white text-xl font-bold rounded-full hover:from-green-700 hover:to-teal-700 transition-all transform hover:scale-105 shadow-2xl"
            >
              🚀 Launch Enhanced AR
            </button>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 border border-white border-opacity-20">
            <h3 className="text-xl font-semibold mb-3 text-white">📋 Instructions</h3>

            <div className="space-y-2 text-gray-300">
              {arType === 'face' ? (
                <>
                  <p>• Ensure good lighting for best results</p>
                  <p>• Position your face clearly in the camera view</p>
                  <p>• AR content will track your facial movements</p>
                  <p>• Try different expressions and head movements</p>
                </>
              ) : (
                <>
                  <p>• Print or display the target image on another screen</p>
                  <p>• Hold the target steady for initial detection</p>
                  <p>• Keep the target within camera view</p>
                  <p>• AR content will appear on the target image</p>
                </>
              )}
            </div>
          </div>

          {targetStatus && (
            <div className="mt-4 p-4 bg-green-600 bg-opacity-20 rounded-lg border border-green-400 border-opacity-50">
              <p className="text-green-300 text-center">{targetStatus}</p>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-gray-400">Powered by MindAR • Three.js • Next.js 15</p>
          </div>
        </div>
      </div>
    </div>
  )
}
