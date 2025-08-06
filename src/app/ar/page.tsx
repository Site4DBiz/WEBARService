'use client'

import React, { useState } from 'react'
import { MindARViewer } from '@/components/ar/MindARViewer'

export default function ARPage() {
  const [arType, setArType] = useState<'image' | 'face'>('face')
  const [showAR, setShowAR] = useState(false)
  const [targetFound, setTargetFound] = useState(false)

  const handleTargetFound = () => {
    console.log('Target found!')
    setTargetFound(true)
  }

  const handleTargetLost = () => {
    console.log('Target lost!')
    setTargetFound(false)
  }

  if (showAR) {
    return (
      <MindARViewer
        type={arType}
        targetUrl={arType === 'image' ? '/targets.mind' : undefined}
        onTargetFound={handleTargetFound}
        onTargetLost={handleTargetLost}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-center mb-8 text-gray-800">WebAR Experience</h1>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-700">Choose AR Type</h2>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <button
                onClick={() => setArType('face')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  arType === 'face'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-4xl mb-3">👤</div>
                <h3 className="text-xl font-semibold mb-2">Face Tracking</h3>
                <p className="text-gray-600">
                  Track facial features and add AR effects to your face
                </p>
              </button>

              <button
                onClick={() => setArType('image')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  arType === 'image'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-4xl mb-3">🖼️</div>
                <h3 className="text-xl font-semibold mb-2">Image Tracking</h3>
                <p className="text-gray-600">Scan target images to display AR content</p>
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={() => setShowAR(true)}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
              >
                Launch AR Experience
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Instructions</h2>

            <div className="space-y-4 text-gray-600">
              {arType === 'face' ? (
                <>
                  <p className="flex items-start">
                    <span className="text-blue-600 mr-2">1.</span>
                    Click &quot;Launch AR Experience&quot; to start
                  </p>
                  <p className="flex items-start">
                    <span className="text-blue-600 mr-2">2.</span>
                    Allow camera access when prompted
                  </p>
                  <p className="flex items-start">
                    <span className="text-blue-600 mr-2">3.</span>
                    Position your face in the camera view
                  </p>
                  <p className="flex items-start">
                    <span className="text-blue-600 mr-2">4.</span>
                    AR content will appear on your face
                  </p>
                </>
              ) : (
                <>
                  <p className="flex items-start">
                    <span className="text-blue-600 mr-2">1.</span>
                    Prepare a target image (print or display on screen)
                  </p>
                  <p className="flex items-start">
                    <span className="text-blue-600 mr-2">2.</span>
                    Click &quot;Launch AR Experience&quot; to start
                  </p>
                  <p className="flex items-start">
                    <span className="text-blue-600 mr-2">3.</span>
                    Allow camera access when prompted
                  </p>
                  <p className="flex items-start">
                    <span className="text-blue-600 mr-2">4.</span>
                    Point camera at the target image
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This application requires camera access and works best on
                mobile devices with good lighting conditions.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center text-gray-500">
            <p>Powered by MindAR and Three.js</p>
          </div>
        </div>
      </div>
    </div>
  )
}
