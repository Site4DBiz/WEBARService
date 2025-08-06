'use client'

import React, { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { ModelLoader, ModelConfig } from './ModelLoader'

export interface ModelControllerConfig extends ModelConfig {
  autoRotate?: boolean
  rotationSpeed?: number
  enableControls?: boolean
  enableZoom?: boolean
  minZoom?: number
  maxZoom?: number
  initialZoom?: number
}

interface ModelControllerProps {
  config: ModelControllerConfig
  scene: THREE.Scene
  renderer?: THREE.WebGLRenderer
  onModelLoaded?: (model: THREE.Group) => void
  onLoadProgress?: (progress: number) => void
  onError?: (error: Error) => void
}

export const ModelController: React.FC<ModelControllerProps> = ({
  config,
  scene,
  renderer,
  onModelLoaded,
  onLoadProgress,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const modelRef = useRef<THREE.Group | null>(null)
  const loaderRef = useRef<ModelLoader | null>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Initialize model loader
        loaderRef.current = new ModelLoader(renderer)

        // Configure model loading
        const modelConfig: ModelConfig = {
          ...config,
          onProgress: (progress) => {
            setLoadProgress(progress)
            onLoadProgress?.(progress)
          },
        }

        // Load the model
        const model = await loaderRef.current.loadModel(modelConfig)
        modelRef.current = model

        // Apply initial zoom if specified
        if (config.initialZoom) {
          model.scale.multiplyScalar(config.initialZoom)
        }

        // Add model to scene
        scene.add(model)

        // Notify parent component
        onModelLoaded?.(model)

        setIsLoading(false)

        // Start animation loop for auto-rotation
        if (config.autoRotate) {
          startAutoRotation()
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load model'
        setError(errorMessage)
        setIsLoading(false)
        onError?.(err as Error)
        console.error('Model loading error:', err)
      }
    }

    loadModel()

    return () => {
      // Cleanup
      if (modelRef.current) {
        scene.remove(modelRef.current)
        modelRef.current = null
      }
      if (loaderRef.current) {
        loaderRef.current.dispose()
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.url])

  const startAutoRotation = () => {
    const animate = () => {
      if (modelRef.current && config.autoRotate) {
        const speed = config.rotationSpeed || 0.01
        modelRef.current.rotation.y += speed
      }

      // Update model animations
      if (loaderRef.current) {
        loaderRef.current.updateAnimation(0.016) // ~60fps
      }

      frameRef.current = requestAnimationFrame(animate)
    }
    animate()
  }

  // Control methods
  const rotateModel = (x: number, y: number, z: number) => {
    if (modelRef.current) {
      modelRef.current.rotation.x += x
      modelRef.current.rotation.y += y
      modelRef.current.rotation.z += z
    }
  }

  const scaleModel = (factor: number) => {
    if (modelRef.current) {
      const currentScale = modelRef.current.scale.x
      const newScale = currentScale * factor

      // Apply zoom limits if specified
      if (config.minZoom && newScale < config.minZoom) return
      if (config.maxZoom && newScale > config.maxZoom) return

      modelRef.current.scale.multiplyScalar(factor)
    }
  }

  const resetTransform = () => {
    if (modelRef.current) {
      modelRef.current.rotation.set(0, 0, 0)
      modelRef.current.position.set(0, 0, 0)
      modelRef.current.scale.set(config.scale || 1, config.scale || 1, config.scale || 1)

      if (config.position) {
        modelRef.current.position.set(...config.position)
      }

      if (config.rotation) {
        modelRef.current.rotation.set(...config.rotation)
      }
    }
  }

  return (
    <>
      {isLoading && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
          <div className="mb-2">Loading 3D Model...</div>
          <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <div className="text-sm mt-1">{loadProgress.toFixed(1)}%</div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-4 bg-red-600 bg-opacity-75 text-white p-4 rounded-lg">
          <div className="font-semibold mb-1">Error Loading Model</div>
          <div className="text-sm">{error}</div>
        </div>
      )}

      {!isLoading && !error && config.enableControls && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          <button
            onClick={() => rotateModel(0, Math.PI / 4, 0)}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Rotate Y
          </button>
          <button
            onClick={() => scaleModel(1.2)}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Zoom In
          </button>
          <button
            onClick={() => scaleModel(0.8)}
            className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Zoom Out
          </button>
          <button
            onClick={resetTransform}
            className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Reset
          </button>
        </div>
      )}
    </>
  )
}

export default ModelController
