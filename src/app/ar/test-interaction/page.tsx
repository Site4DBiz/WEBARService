'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { InteractionManager, InteractableObject } from '@/lib/ar/InteractionManager'
import { InteractionController, InteractionSettings } from '@/components/ar/InteractionController'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export default function TestInteractionPage() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const interactionManagerRef = useRef<InteractionManager | null>(null)
  const animationMixerRef = useRef<THREE.AnimationMixer | null>(null)
  const clockRef = useRef<THREE.Clock>(new THREE.Clock())
  const [availableAnimations, setAvailableAnimations] = useState<string[]>([])
  const [selectedObject, setSelectedObject] = useState<'cube' | 'sphere' | 'model'>('cube')
  const [modelLoaded, setModelLoaded] = useState(false)
  const [interactionEvents, setInteractionEvents] = useState<string[]>([])

  // イベントログを追加
  const addEventLog = (event: string) => {
    setInteractionEvents((prev) => [...prev.slice(-4), event])
  }

  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 5)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth - 400, window.innerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

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

    // Add grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc)
    scene.add(gridHelper)

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(2)
    scene.add(axesHelper)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // Interaction Manager
    const interactionManager = new InteractionManager(scene, camera, renderer)
    interactionManagerRef.current = interactionManager

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)

      const delta = clockRef.current.getDelta()

      if (animationMixerRef.current) {
        animationMixerRef.current.update(delta)
      }

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      camera.aspect = (window.innerWidth - 400) / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth - 400, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      interactionManager.dispose()
      renderer.dispose()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const createTestObject = (type: 'cube' | 'sphere' | 'model') => {
    if (!sceneRef.current || !interactionManagerRef.current) return

    // 既存のインタラクティブオブジェクトを削除
    interactionManagerRef.current.removeInteractable('test-object')

    // 既存のメッシュを削除
    const existingObject = sceneRef.current.getObjectByName('test-object')
    if (existingObject) {
      sceneRef.current.remove(existingObject)
    }

    let object: THREE.Object3D

    if (type === 'cube') {
      const geometry = new THREE.BoxGeometry(1, 1, 1)
      const material = new THREE.MeshStandardMaterial({
        color: 0x2196f3,
        metalness: 0.3,
        roughness: 0.4,
      })
      object = new THREE.Mesh(geometry, material)
      object.castShadow = true
      object.receiveShadow = true
      setAvailableAnimations([])
    } else if (type === 'sphere') {
      const geometry = new THREE.SphereGeometry(0.5, 32, 16)
      const material = new THREE.MeshStandardMaterial({
        color: 0xff9800,
        metalness: 0.3,
        roughness: 0.4,
      })
      object = new THREE.Mesh(geometry, material)
      object.castShadow = true
      object.receiveShadow = true
      setAvailableAnimations([])
    } else {
      // Load GLTF model
      const loader = new GLTFLoader()
      loader.load(
        'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
        (gltf) => {
          object = gltf.scene
          object.name = 'test-object'
          object.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true
              child.receiveShadow = true
            }
          })

          // アニメーション設定
          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(object)
            animationMixerRef.current = mixer
            ;(object as any).mixer = mixer
            ;(object as any).animations = gltf.animations

            const animationNames = gltf.animations.map((clip) => clip.name)
            setAvailableAnimations(animationNames)

            // デフォルトアニメーションを再生
            const action = mixer.clipAction(gltf.animations[0])
            action.play()
          }

          setModelLoaded(true)
          sceneRef.current?.add(object)
        },
        (progress) => {
          console.log('Loading:', (progress.loaded / progress.total) * 100 + '%')
        },
        (error) => {
          console.error('Error loading model:', error)
          // フォールバックとしてキューブを作成
          const geometry = new THREE.BoxGeometry(1, 1, 1)
          const material = new THREE.MeshStandardMaterial({ color: 0x808080 })
          object = new THREE.Mesh(geometry, material)
          object.name = 'test-object'
          sceneRef.current?.add(object)
        }
      )
      return
    }

    object.name = 'test-object'
    sceneRef.current.add(object)
  }

  const handleSettingsChange = (settings: InteractionSettings) => {
    if (!interactionManagerRef.current || !sceneRef.current) return

    const object = sceneRef.current.getObjectByName('test-object')
    if (!object) return

    // インタラクティブオブジェクトを更新
    const interactableObject: InteractableObject = {
      object,
      config: {
        enableClick: settings.enableClick,
        enableHover: settings.enableHover,
        enableDrag: settings.enableDrag,
        enablePinch: settings.enablePinch,
        enableRotate: settings.enableRotate,
        onClick: (event) => {
          addEventLog(
            `クリック: ${event.point ? `(${event.point.x.toFixed(2)}, ${event.point.y.toFixed(2)}, ${event.point.z.toFixed(2)})` : ''}`
          )
        },
        onHover: (event) => {
          addEventLog('ホバー開始')
        },
        onHoverEnd: (event) => {
          addEventLog('ホバー終了')
        },
        onDragStart: (event) => {
          addEventLog('ドラッグ開始')
        },
        onDragMove: (event) => {
          // ドラッグ中は頻繁に発生するため、ログは出さない
        },
        onDragEnd: (event) => {
          addEventLog('ドラッグ終了')
        },
        onPinch: (event) => {
          addEventLog(`ピンチ: ${event.scale?.toFixed(2)}x`)
        },
        onRotate: (event) => {
          addEventLog(`回転: ${event.rotation?.toFixed(2)}rad`)
        },
      },
      animations: settings.animations,
      actions: {
        url: settings.actions.url,
        sound: settings.actions.sound,
        colorChange: settings.actions.colorChange
          ? parseInt(settings.actions.colorChange.replace('#', '0x'))
          : undefined,
        scaleChange: settings.actions.scaleChange,
      },
    }

    interactionManagerRef.current.removeInteractable('test-object')
    interactionManagerRef.current.addInteractable('test-object', interactableObject)
  }

  useEffect(() => {
    createTestObject(selectedObject)
  }, [selectedObject])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* 3D View */}
        <div className="flex-1 relative">
          <div ref={mountRef} className="w-full h-full" />

          {/* Event Log */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 w-64">
            <h3 className="text-sm font-semibold mb-2">イベントログ</h3>
            <div className="space-y-1 text-xs">
              {interactionEvents.length === 0 ? (
                <p className="text-gray-500">イベントなし</p>
              ) : (
                interactionEvents.map((event, index) => (
                  <p key={index} className="text-gray-700 animate-fade-in">
                    {event}
                  </p>
                ))
              )}
            </div>
          </div>

          {/* Object Selector */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-sm font-semibold mb-2">テストオブジェクト</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedObject('cube')}
                className={`px-3 py-1 rounded text-sm ${
                  selectedObject === 'cube'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                キューブ
              </button>
              <button
                onClick={() => setSelectedObject('sphere')}
                className={`px-3 py-1 rounded text-sm ${
                  selectedObject === 'sphere'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                球体
              </button>
              <button
                onClick={() => setSelectedObject('model')}
                className={`px-3 py-1 rounded text-sm ${
                  selectedObject === 'model'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                3Dモデル
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 w-64">
            <h3 className="text-sm font-semibold mb-2">操作方法</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• マウス左ドラッグ: カメラ回転</li>
              <li>• マウス右ドラッグ: カメラ移動</li>
              <li>• マウスホイール: ズーム</li>
              <li>• オブジェクトクリック: インタラクション</li>
              <li>• タッチ操作にも対応</li>
            </ul>
          </div>
        </div>

        {/* Control Panel */}
        <div className="w-96 bg-white shadow-lg overflow-y-auto">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">インタラクションテスト</h1>

            <InteractionController
              onSettingsChange={handleSettingsChange}
              availableAnimations={availableAnimations}
            />

            {/* Info */}
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">テスト情報</h3>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• 左側のビューでオブジェクトを操作できます</li>
                <li>• 設定を変更すると即座に反映されます</li>
                <li>• 3Dモデルを選択するとアニメーションが利用可能</li>
                <li>• イベントログで動作を確認できます</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
