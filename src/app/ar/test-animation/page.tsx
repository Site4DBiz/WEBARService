'use client'

import React, { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ModelLoader } from '@/components/ar/ModelLoader'
import AnimationController from '@/components/ar/AnimationController'
import { AnimationManager } from '@/lib/ar/AnimationManager'

export default function TestAnimationPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationManagerRef = useRef<AnimationManager | null>(null)
  const frameRef = useRef<number>(0)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelUrl, setModelUrl] = useState('')
  const [hasAnimations, setHasAnimations] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 1, 3)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.target.set(0, 0, 0)
    controlsRef.current = controls

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.near = 0.1
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -10
    directionalLight.shadow.camera.right = 10
    directionalLight.shadow.camera.top = 10
    directionalLight.shadow.camera.bottom = -10
    scene.add(directionalLight)

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10)
    scene.add(gridHelper)

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)

      if (controlsRef.current) {
        controlsRef.current.update()
      }

      if (animationManagerRef.current) {
        animationManagerRef.current.update()
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return

      cameraRef.current.aspect =
        containerRef.current.clientWidth / containerRef.current.clientHeight
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      )
    }
    window.addEventListener('resize', handleResize)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
      window.removeEventListener('resize', handleResize)

      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
      }

      rendererRef.current?.dispose()

      if (animationManagerRef.current) {
        animationManagerRef.current.dispose()
      }
    }
  }, [])

  const loadModel = async () => {
    if (!modelUrl || !sceneRef.current || !rendererRef.current) return

    setIsLoading(true)
    setError(null)
    setHasAnimations(false)

    // Clear previous model and animations
    if (animationManagerRef.current) {
      animationManagerRef.current.dispose()
      animationManagerRef.current = null
    }

    // Remove existing models from scene
    const modelsToRemove: THREE.Object3D[] = []
    sceneRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
        if (child.userData.isModel) {
          modelsToRemove.push(child)
        }
      }
    })
    modelsToRemove.forEach((model) => sceneRef.current!.remove(model))

    try {
      const loader = new ModelLoader(rendererRef.current)
      const result = await loader.loadModelWithAnimations({
        url: modelUrl,
        scale: 1,
        animation: true,
        castShadow: true,
        receiveShadow: true,
      })

      result.model.userData.isModel = true
      sceneRef.current.add(result.model)

      if (result.animationManager) {
        animationManagerRef.current = result.animationManager
        const animations = result.animationManager.getAnimationNames()
        setHasAnimations(animations.length > 0)

        if (animations.length > 0) {
          console.log('Available animations:', animations)
        }
      }

      // Center camera on model
      const box = new THREE.Box3().setFromObject(result.model)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)

      cameraRef.current!.position.set(maxDim * 1.5, maxDim * 1.5, maxDim * 1.5)
      cameraRef.current!.lookAt(center)
      controlsRef.current!.target.copy(center)
      controlsRef.current!.update()

      setIsLoading(false)
    } catch (err) {
      console.error('Error loading model:', err)
      setError(err instanceof Error ? err.message : 'Failed to load model')
      setIsLoading(false)
    }
  }

  const loadSampleModel = () => {
    // Load a sample animated model from a public CDN
    setModelUrl('https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb')
    setTimeout(() => loadModel(), 100)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">アニメーション制御テスト</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              3Dモデル URL (GLB/GLTF/FBX)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={modelUrl}
                onChange={(e) => setModelUrl(e.target.value)}
                placeholder="https://example.com/model.glb"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={loadModel}
                disabled={!modelUrl || isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? '読み込み中...' : 'モデルを読み込む'}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadSampleModel}
              disabled={isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
            >
              サンプルモデルを読み込む
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div ref={containerRef} className="w-full" style={{ height: '600px' }} />
            </div>
          </div>

          <div className="lg:col-span-1">
            {hasAnimations ? (
              <AnimationController
                animationManager={animationManagerRef.current}
                className="sticky top-4"
                showTimeline={true}
                showSpeedControl={true}
                showLoopControl={true}
                showBlendControl={true}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">アニメーションコントロール</h3>
                <p className="text-gray-500">
                  {isLoading
                    ? 'モデルを読み込み中...'
                    : 'アニメーション付きのモデルを読み込んでください'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">使い方</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>URLフィールドにGLB/GLTF/FBX形式の3Dモデルファイルへのリンクを入力します</li>
            <li>「モデルを読み込む」ボタンをクリックして3Dモデルを読み込みます</li>
            <li>
              または「サンプルモデルを読み込む」ボタンでアニメーション付きのサンプルモデルを読み込めます
            </li>
            <li>
              モデルにアニメーションが含まれている場合、右側のコントロールパネルが有効になります
            </li>
            <li>アニメーションの再生、停止、速度調整、ループモードの変更などが可能です</li>
            <li>マウスでドラッグして3Dモデルを回転、スクロールでズームができます</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
