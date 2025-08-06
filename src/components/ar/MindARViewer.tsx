'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useMindAR } from '@/hooks/useMindAR'

interface MindARViewerProps {
  type: 'image' | 'face'
  targetUrl?: string
  onTargetFound?: () => void
  onTargetLost?: () => void
  children?: React.ReactNode
}

export const MindARViewer: React.FC<MindARViewerProps> = ({
  type,
  targetUrl,
  onTargetFound,
  onTargetLost,
  children,
}) => {
  const [isStarted, setIsStarted] = useState(false)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const anchorRef = useRef<any>(null)

  const { containerRef, mindAR, isLoading, isReady, error, start, stop, addAnchor } = useMindAR({
    type,
    imageTargetSrc: targetUrl,
    maxTrack: 1,
  })

  useEffect(() => {
    if (!isReady || !mindAR) return

    const setupScene = () => {
      sceneRef.current = mindAR.scene

      const anchor = addAnchor(0)
      if (anchor) {
        anchorRef.current = anchor

        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
        const material = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          wireframe: true,
        })
        const cube = new THREE.Mesh(geometry, material)
        anchor.group.add(cube)

        if (onTargetFound) {
          anchor.onTargetFound = onTargetFound
        }
        if (onTargetLost) {
          anchor.onTargetLost = onTargetLost
        }

        const clock = new THREE.Clock()
        const animate = () => {
          const delta = clock.getDelta()
          cube.rotation.x += delta
          cube.rotation.y += delta * 2
        }

        mindAR.renderer.setAnimationLoop(() => {
          animate()
          mindAR.renderer.render(mindAR.scene, mindAR.camera)
        })
      }
    }

    setupScene()

    return () => {
      if (mindAR && mindAR.renderer) {
        mindAR.renderer.setAnimationLoop(null)
      }
    }
  }, [isReady, mindAR, addAnchor, onTargetFound, onTargetLost])

  const handleStart = async () => {
    if (!isReady) return

    setIsStarted(true)
    await start()
  }

  const handleStop = () => {
    setIsStarted(false)
    stop()
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen bg-black">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%' }}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-xl">Loading AR Experience...</p>
          </div>
        </div>
      )}

      {isReady && !isStarted && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <button
            onClick={handleStart}
            className="px-8 py-4 bg-blue-600 text-white text-xl font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            Start AR Experience
          </button>
        </div>
      )}

      {isStarted && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
          >
            Stop AR
          </button>
        </div>
      )}

      {isStarted && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-white bg-opacity-90 rounded-lg p-4 shadow-lg">
            <p className="text-sm text-gray-700">
              {type === 'image'
                ? 'Point your camera at the target image'
                : 'Position your face in the camera view'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
