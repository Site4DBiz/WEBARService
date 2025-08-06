'use client'

import React, { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { InteractionSettings } from '@/components/ar/InteractionController'
import { Loader2 } from 'lucide-react'
import * as THREE from 'three'
import { InteractionManager, InteractableObject } from '@/lib/ar/InteractionManager'

const EnhancedMindARViewer = dynamic(
  () => import('@/components/ar/EnhancedMindARViewer').then(mod => ({ default: mod.EnhancedMindARViewer })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
      </div>
    )
  }
)

const InteractionController = dynamic(
  () => import('@/components/ar/InteractionController').then(mod => ({ default: mod.InteractionController })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
      </div>
    )
  }
)

export default function TestARInteractionPage() {
  const [isARActive, setIsARActive] = useState(false)
  const [interactionSettings, setInteractionSettings] = useState<InteractionSettings>({
    enableClick: true,
    enableHover: true,
    enableDrag: false,
    enablePinch: false,
    enableRotate: false,
    actions: {},
    animations: {}
  })
  const [detectionStatus, setDetectionStatus] = useState<string>('準備中...')
  const interactionManagerRef = useRef<InteractionManager | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)

  const handleARSetup = (scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) => {
    sceneRef.current = scene

    // InteractionManagerを初期化
    const interactionManager = new InteractionManager(scene, camera, renderer)
    interactionManagerRef.current = interactionManager

    // テスト用のインタラクティブオブジェクトを追加
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      metalness: 0.3,
      roughness: 0.4
    })
    const cube = new THREE.Mesh(geometry, material)
    cube.position.set(0, 0, -0.5)
    
    // インタラクティブオブジェクトとして登録
    const interactableObject: InteractableObject = {
      object: cube,
      config: {
        enableClick: interactionSettings.enableClick,
        enableHover: interactionSettings.enableHover,
        enableDrag: interactionSettings.enableDrag,
        enablePinch: interactionSettings.enablePinch,
        enableRotate: interactionSettings.enableRotate,
        onClick: () => {
          console.log('AR Object clicked!')
          material.color.setHex(Math.random() * 0xffffff)
        },
        onHover: () => {
          cube.scale.set(1.2, 1.2, 1.2)
        },
        onHoverEnd: () => {
          cube.scale.set(1, 1, 1)
        },
        onDragMove: (event) => {
          if (event.point) {
            cube.position.copy(event.point)
          }
        }
      },
      actions: interactionSettings.actions,
      animations: interactionSettings.animations
    }

    interactionManager.addInteractable('test-cube', interactableObject)
    scene.add(cube)

    // ライト追加
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(1, 1, 1)
    scene.add(directionalLight)
  }

  useEffect(() => {
    // インタラクション設定が変更されたときの処理
    if (interactionManagerRef.current && sceneRef.current) {
      const cube = sceneRef.current.getObjectByName('test-cube')
      if (cube) {
        interactionManagerRef.current.removeInteractable('test-cube')
        
        const interactableObject: InteractableObject = {
          object: cube,
          config: {
            enableClick: interactionSettings.enableClick,
            enableHover: interactionSettings.enableHover,
            enableDrag: interactionSettings.enableDrag,
            enablePinch: interactionSettings.enablePinch,
            enableRotate: interactionSettings.enableRotate,
            onClick: () => {
              console.log('AR Object clicked!')
              const material = (cube as THREE.Mesh).material as THREE.MeshStandardMaterial
              material.color.setHex(Math.random() * 0xffffff)
            },
            onHover: () => {
              cube.scale.set(1.2, 1.2, 1.2)
            },
            onHoverEnd: () => {
              cube.scale.set(1, 1, 1)
            },
            onDragMove: (event) => {
              if (event.point) {
                cube.position.copy(event.point)
              }
            }
          },
          actions: interactionSettings.actions,
          animations: interactionSettings.animations
        }

        interactionManagerRef.current.addInteractable('test-cube', interactableObject)
      }
    }
  }, [interactionSettings])

  const handleTargetFound = () => {
    setDetectionStatus('マーカー検出中')
  }

  const handleTargetLost = () => {
    setDetectionStatus('マーカーを探しています...')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">AR インタラクションテスト</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AR View */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-4 bg-gray-100 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">ARビュー</h2>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    isARActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {detectionStatus}
                  </span>
                </div>
              </div>

              <div className="relative aspect-video bg-black">
                {!isARActive ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => setIsARActive(true)}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      ARを開始
                    </button>
                  </div>
                ) : (
                  <EnhancedMindARViewer
                    type="image"
                    targetUrl="/hiro.png"
                    content={{ 
                      type: 'basic-cube',
                      color: 0x00ff00
                    }}
                    onTargetFound={handleTargetFound}
                    onTargetLost={handleTargetLost}
                    showStats={true}
                    debugMode={true}
                    onSceneSetup={handleARSetup}
                  />
                )}
              </div>

              {isARActive && (
                <div className="p-4 bg-gray-50">
                  <button
                    onClick={() => {
                      setIsARActive(false)
                      setDetectionStatus('準備中...')
                      if (interactionManagerRef.current) {
                        interactionManagerRef.current.dispose()
                        interactionManagerRef.current = null
                      }
                    }}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    ARを停止
                  </button>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">使い方</h3>
              <ol className="space-y-2 text-sm text-gray-600">
                <li>1. 「ARを開始」ボタンをクリックしてカメラを起動</li>
                <li>2. Hiroマーカーをカメラに向ける（<a href="https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png" target="_blank" className="text-blue-500 underline">ダウンロード</a>）</li>
                <li>3. 緑色のキューブが表示されます</li>
                <li>4. 右側のコントロールパネルでインタラクション設定を変更</li>
                <li>5. オブジェクトをクリック、ドラッグ、ピンチなどで操作</li>
              </ol>
            </div>
          </div>

          {/* Control Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg sticky top-4">
              <div className="p-4 bg-gray-100 border-b">
                <h2 className="text-lg font-semibold">インタラクション設定</h2>
              </div>
              
              <div className="p-4">
                <InteractionController
                  onSettingsChange={setInteractionSettings}
                  availableAnimations={[]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}