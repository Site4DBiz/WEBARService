'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useMindAR } from '@/hooks/useMindAR'
import { ModelLoader, ModelConfig, createBasicShapes } from './ModelLoader'

export type ARContentType = 'basic-cube' | 'basic-sphere' | 'custom-model' | 'particle' | 'text'

export interface ARContent {
  type: ARContentType
  modelConfig?: ModelConfig
  text?: string
  color?: number
  particleCount?: number
}

interface EnhancedMindARViewerProps {
  type: 'image' | 'face'
  targetUrl?: string
  content?: ARContent
  onTargetFound?: () => void
  onTargetLost?: () => void
  showStats?: boolean
  enableLighting?: boolean
}

export const EnhancedMindARViewer: React.FC<EnhancedMindARViewerProps> = ({
  type,
  targetUrl,
  content = { type: 'basic-cube' },
  onTargetFound,
  onTargetLost,
  showStats = false,
  enableLighting = true,
}) => {
  const [isStarted, setIsStarted] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [targetStatus, setTargetStatus] = useState<'searching' | 'found' | 'lost'>('searching')
  const sceneRef = useRef<THREE.Scene | null>(null)
  const anchorRef = useRef<any>(null)
  const modelLoaderRef = useRef<ModelLoader | null>(null)
  const animationRef = useRef<any>(null)

  const { containerRef, mindAR, isLoading, isReady, error, start, stop, addAnchor } = useMindAR({
    type,
    imageTargetSrc: targetUrl,
    maxTrack: 1,
  })

  useEffect(() => {
    if (!isReady || !mindAR) return

    const setupScene = async () => {
      sceneRef.current = mindAR.scene
      modelLoaderRef.current = new ModelLoader()

      // Add lighting if enabled
      if (enableLighting && sceneRef.current) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(10, 10, 10)
        sceneRef.current.add(ambientLight)
        sceneRef.current.add(directionalLight)
      }

      const anchor = addAnchor(0)
      if (anchor) {
        anchorRef.current = anchor

        // Create AR content based on type
        let arObject: THREE.Object3D | null = null

        switch (content.type) {
          case 'basic-cube':
            arObject = createBasicShapes.cube(0.2, content.color || 0x00ff00)
            break

          case 'basic-sphere':
            arObject = createBasicShapes.sphere(0.1, content.color || 0xff0000)
            break

          case 'custom-model':
            if (content.modelConfig) {
              try {
                arObject = await modelLoaderRef.current.loadModel(content.modelConfig)
              } catch (error) {
                console.error('Failed to load model:', error)
                // Fallback to basic cube
                arObject = createBasicShapes.cube()
              }
            }
            break

          case 'particle':
            arObject = createParticleSystem(content.particleCount || 1000)
            break

          case 'text':
            arObject = await createTextMesh(content.text || 'AR Text')
            break
        }

        if (arObject) {
          anchor.group.add(arObject)
          animationRef.current = arObject
        }

        // Setup target event handlers
        anchor.onTargetFound = () => {
          setTargetStatus('found')
          onTargetFound?.()
        }

        anchor.onTargetLost = () => {
          setTargetStatus('lost')
          onTargetLost?.()
        }

        // Animation loop
        const clock = new THREE.Clock()
        const animate = () => {
          const delta = clock.getDelta()

          // Animate the AR object
          if (animationRef.current) {
            if (content.type !== 'particle' && content.type !== 'custom-model') {
              animationRef.current.rotation.y += delta
            }
          }

          // Update model animations
          if (modelLoaderRef.current) {
            modelLoaderRef.current.updateAnimation(delta)
          }

          // Update particle system
          if (content.type === 'particle' && animationRef.current) {
            animationRef.current.rotation.y += delta * 0.5
          }
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
      if (modelLoaderRef.current) {
        modelLoaderRef.current.dispose()
      }
    }
  }, [isReady, mindAR, content, enableLighting, addAnchor, onTargetFound, onTargetLost])

  const handleStart = async () => {
    if (!isReady) return

    setIsStarted(true)
    setTargetStatus('searching')
    await start()
  }

  const handleStop = () => {
    setIsStarted(false)
    setTargetStatus('searching')
    stop()
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">AR Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
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
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-20">
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-ping"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-pulse"></div>
            </div>
            <p className="text-white text-2xl font-semibold mb-2">Loading AR Experience</p>
            <div className="w-64 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {isReady && !isStarted && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gradient-to-b from-gray-900 to-black">
          <div className="text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">{type === 'image' ? '🖼️' : '👤'}</div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {type === 'image' ? 'Image Tracking AR' : 'Face Tracking AR'}
              </h2>
              <p className="text-gray-400">
                {type === 'image'
                  ? 'Point your camera at the target image'
                  : 'Position your face in the camera view'}
              </p>
            </div>
            <button
              onClick={handleStart}
              className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-2xl"
            >
              Start AR Experience
            </button>
          </div>
        </div>
      )}

      {isStarted && (
        <>
          <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start">
            <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    targetStatus === 'found'
                      ? 'bg-green-500'
                      : targetStatus === 'lost'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  } animate-pulse`}
                ></div>
                <span className="text-white text-sm">
                  {targetStatus === 'found'
                    ? 'Target Found'
                    : targetStatus === 'lost'
                      ? 'Target Lost'
                      : 'Searching...'}
                </span>
              </div>
            </div>

            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
            >
              Stop AR
            </button>
          </div>

          {showStats && (
            <div className="absolute bottom-4 left-4 z-10">
              <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2 text-white text-xs">
                <div>Type: {type}</div>
                <div>Content: {content.type}</div>
                <div>Status: {targetStatus}</div>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 right-4 z-10">
            <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
              <p className="text-white text-sm">
                {type === 'image' ? '📷 Scan the target image' : '🤳 Show your face to camera'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Helper function to create particle system
function createParticleSystem(particleCount: number): THREE.Points {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3
    positions[i3] = (Math.random() - 0.5) * 0.5
    positions[i3 + 1] = (Math.random() - 0.5) * 0.5
    positions[i3 + 2] = (Math.random() - 0.5) * 0.5

    colors[i3] = Math.random()
    colors[i3 + 1] = Math.random()
    colors[i3 + 2] = Math.random()
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.01,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  })

  return new THREE.Points(geometry, material)
}

// Helper function to create text mesh
async function createTextMesh(text: string): Promise<THREE.Mesh> {
  // For now, return a simple plane with the text as fallback
  // In production, you would use TextGeometry or load a font
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  canvas.width = 512
  canvas.height = 128

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.fillStyle = '#000000'
  context.font = 'bold 48px Arial'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  const geometry = new THREE.PlaneGeometry(0.4, 0.1)
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  })

  return new THREE.Mesh(geometry, material)
}
