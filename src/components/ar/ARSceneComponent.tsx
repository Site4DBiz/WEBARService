'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useMindAR } from '@/hooks/useMindAR'
import { CameraPermission } from './CameraPermission'

interface ARContent {
  type: '3d-model' | 'video' | 'image' | 'text' | 'primitive'
  url?: string
  text?: string
  primitiveType?: 'box' | 'sphere' | 'cylinder' | 'plane'
  scale?: { x: number; y: number; z: number }
  position?: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
  color?: string
  animation?: {
    type: 'rotate' | 'bounce' | 'scale' | 'custom'
    speed?: number
    axis?: 'x' | 'y' | 'z'
  }
}

interface ARSceneComponentProps {
  type: 'image' | 'face'
  targetUrl?: string
  contents?: ARContent[]
  onTargetFound?: (targetIndex: number) => void
  onTargetLost?: (targetIndex: number) => void
  onSceneReady?: (scene: THREE.Scene) => void
  autoStart?: boolean
  showDebugInfo?: boolean
}

export const ARSceneComponent: React.FC<ARSceneComponentProps> = ({
  type,
  targetUrl,
  contents = [],
  onTargetFound,
  onTargetLost,
  onSceneReady,
  autoStart = false,
  showDebugInfo = false,
}) => {
  const [isStarted, setIsStarted] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [trackingStatus, setTrackingStatus] = useState<'idle' | 'tracking' | 'lost'>('idle')
  const [loadingStatus, setLoadingStatus] = useState<string>('')

  const sceneRef = useRef<THREE.Scene | null>(null)
  const anchorsRef = useRef<any[]>([])
  const animationMixersRef = useRef<THREE.AnimationMixer[]>([])
  const clockRef = useRef(new THREE.Clock())

  const { containerRef, mindAR, isLoading, isReady, error, start, stop, addAnchor } = useMindAR({
    type,
    imageTargetSrc: targetUrl,
    maxTrack: 1,
  })

  // 3Dモデルローダー
  const gltfLoader = useRef(new GLTFLoader())

  // カメラパーミッションが許可されたときのハンドラ
  const handlePermissionGranted = useCallback(() => {
    setHasPermission(true)
  }, [])

  // プリミティブジオメトリを作成
  const createPrimitive = useCallback((content: ARContent): THREE.Mesh => {
    let geometry: THREE.BufferGeometry

    switch (content.primitiveType) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.1, 32, 32)
        break
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 32)
        break
      case 'plane':
        geometry = new THREE.PlaneGeometry(0.3, 0.3)
        break
      case 'box':
      default:
        geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
        break
    }

    const material = new THREE.MeshBasicMaterial({
      color: content.color || 0x00ff00,
      wireframe: content.primitiveType === 'box',
    })

    const mesh = new THREE.Mesh(geometry, material)

    // 位置、回転、スケールの設定
    if (content.position) {
      mesh.position.set(content.position.x, content.position.y, content.position.z)
    }
    if (content.rotation) {
      mesh.rotation.set(
        THREE.MathUtils.degToRad(content.rotation.x),
        THREE.MathUtils.degToRad(content.rotation.y),
        THREE.MathUtils.degToRad(content.rotation.z)
      )
    }
    if (content.scale) {
      mesh.scale.set(content.scale.x, content.scale.y, content.scale.z)
    }

    return mesh
  }, [])

  // 3Dモデルをロード
  const load3DModel = useCallback(async (url: string, content: ARContent): Promise<THREE.Group> => {
    return new Promise((resolve, reject) => {
      setLoadingStatus(`Loading 3D model: ${url}`)

      gltfLoader.current.load(
        url,
        (gltf: any) => {
          const model = gltf.scene

          // アニメーションミキサーの設定
          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model)
            animationMixersRef.current.push(mixer)

            // 最初のアニメーションを再生
            const action = mixer.clipAction(gltf.animations[0])
            action.play()
          }

          // 位置、回転、スケールの設定
          if (content.position) {
            model.position.set(content.position.x, content.position.y, content.position.z)
          }
          if (content.rotation) {
            model.rotation.set(
              THREE.MathUtils.degToRad(content.rotation.x),
              THREE.MathUtils.degToRad(content.rotation.y),
              THREE.MathUtils.degToRad(content.rotation.z)
            )
          }
          if (content.scale) {
            model.scale.set(content.scale.x, content.scale.y, content.scale.z)
          }

          setLoadingStatus('')
          resolve(model)
        },
        (progress: any) => {
          const percentComplete = (progress.loaded / progress.total) * 100
          setLoadingStatus(`Loading 3D model: ${percentComplete.toFixed(0)}%`)
        },
        (error: any) => {
          console.error('Error loading 3D model:', error)
          setLoadingStatus('')
          reject(error)
        }
      )
    })
  }, [])

  // コンテンツをシーンに追加
  const addContentToAnchor = useCallback(
    async (anchor: any, content: ARContent) => {
      try {
        let object3D: THREE.Object3D | null = null

        switch (content.type) {
          case 'primitive':
            object3D = createPrimitive(content)
            break

          case '3d-model':
            if (content.url) {
              object3D = await load3DModel(content.url, content)
            }
            break

          case 'text':
            // テキストメッシュの作成（簡易版）
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')
            if (context && content.text) {
              canvas.width = 512
              canvas.height = 256
              context.fillStyle = 'white'
              context.fillRect(0, 0, canvas.width, canvas.height)
              context.fillStyle = 'black'
              context.font = '48px Arial'
              context.textAlign = 'center'
              context.textBaseline = 'middle'
              context.fillText(content.text, canvas.width / 2, canvas.height / 2)

              const texture = new THREE.CanvasTexture(canvas)
              const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true })
              const geometry = new THREE.PlaneGeometry(0.5, 0.25)
              object3D = new THREE.Mesh(geometry, material)
            }
            break

          // TODO: video, imageタイプの実装
        }

        if (object3D) {
          // アニメーションの設定
          if (content.animation) {
            const animate = () => {
              const delta = clockRef.current.getDelta()
              const speed = content.animation?.speed || 1

              switch (content.animation?.type) {
                case 'rotate':
                  const axis = content.animation.axis || 'y'
                  object3D!.rotation[axis] += delta * speed
                  break

                case 'bounce':
                  object3D!.position.y = Math.sin(Date.now() * 0.001 * speed) * 0.1
                  break

                case 'scale':
                  const scale = 1 + Math.sin(Date.now() * 0.001 * speed) * 0.2
                  object3D!.scale.setScalar(scale)
                  break
              }
            }

            // アニメーションループに追加
            object3D.userData.animate = animate
          }

          anchor.group.add(object3D)
        }
      } catch (error) {
        console.error('Error adding content to anchor:', error)
      }
    },
    [createPrimitive, load3DModel]
  )

  // シーンのセットアップ
  useEffect(() => {
    if (!isReady || !mindAR) return

    const setupScene = async () => {
      sceneRef.current = mindAR.scene

      // シーンの準備完了コールバック
      if (onSceneReady) {
        onSceneReady(mindAR.scene)
      }

      // アンカーの作成
      const anchor = addAnchor(0)
      if (anchor) {
        anchorsRef.current.push(anchor)

        // ターゲット検出イベント
        anchor.onTargetFound = () => {
          setTrackingStatus('tracking')
          if (onTargetFound) onTargetFound(0)
        }

        anchor.onTargetLost = () => {
          setTrackingStatus('lost')
          if (onTargetLost) onTargetLost(0)
        }

        // コンテンツの追加
        if (contents.length > 0) {
          for (const content of contents) {
            await addContentToAnchor(anchor, content)
          }
        } else {
          // デフォルトコンテンツ（緑のワイヤーフレームキューブ）
          const defaultContent: ARContent = {
            type: 'primitive',
            primitiveType: 'box',
            animation: { type: 'rotate', axis: 'y', speed: 1 },
          }
          await addContentToAnchor(anchor, defaultContent)
        }
      }

      // レンダリングループ
      mindAR.renderer.setAnimationLoop(() => {
        // アニメーションミキサーの更新
        const delta = clockRef.current.getDelta()
        animationMixersRef.current.forEach((mixer) => mixer.update(delta))

        // カスタムアニメーションの実行
        mindAR.scene.traverse((child: any) => {
          if (child.userData.animate) {
            child.userData.animate()
          }
        })

        mindAR.renderer.render(mindAR.scene, mindAR.camera)
      })
    }

    setupScene()

    return () => {
      if (mindAR && mindAR.renderer) {
        mindAR.renderer.setAnimationLoop(null)
      }
      animationMixersRef.current = []
    }
  }, [
    isReady,
    mindAR,
    addAnchor,
    contents,
    onTargetFound,
    onTargetLost,
    onSceneReady,
    addContentToAnchor,
  ])

  // 自動開始
  useEffect(() => {
    if (hasPermission && autoStart && isReady && !isStarted) {
      handleStart()
    }
  }, [hasPermission, autoStart, isReady, isStarted])

  const handleStart = async () => {
    if (!isReady) return

    try {
      setIsStarted(true)
      setTrackingStatus('idle')
      await start()
    } catch (err) {
      console.error('Failed to start AR:', err)
      setIsStarted(false)
    }
  }

  const handleStop = () => {
    setIsStarted(false)
    setTrackingStatus('idle')
    stop()
  }

  // エラー表示
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">AR Error</h2>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <CameraPermission onPermissionGranted={handlePermissionGranted}>
      <div className="relative w-full h-screen bg-black">
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        />

        {/* ローディング表示 */}
        {(isLoading || loadingStatus) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-xl">{loadingStatus || 'Loading AR Experience...'}</p>
            </div>
          </div>
        )}

        {/* スタートボタン */}
        {isReady && !isStarted && !autoStart && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <button
              onClick={handleStart}
              className="px-8 py-4 bg-green-600 text-white text-xl font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg"
            >
              Start AR Experience
            </button>
          </div>
        )}

        {/* コントロールとステータス */}
        {isStarted && (
          <>
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
              >
                Stop AR
              </button>
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        trackingStatus === 'tracking'
                          ? 'bg-green-500 animate-pulse'
                          : trackingStatus === 'lost'
                            ? 'bg-yellow-500'
                            : 'bg-gray-400'
                      }`}
                    ></div>
                    <p className="text-sm font-medium text-gray-900">
                      {trackingStatus === 'tracking'
                        ? 'Target Detected'
                        : trackingStatus === 'lost'
                          ? 'Target Lost'
                          : 'Searching for Target'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600">
                    {type === 'image' ? 'Point at target image' : 'Face the camera'}
                  </p>
                </div>
              </div>
            </div>

            {/* デバッグ情報 */}
            {showDebugInfo && (
              <div className="absolute top-4 left-4 z-10">
                <div className="bg-black bg-opacity-75 text-white text-xs p-2 rounded font-mono">
                  <div>Type: {type}</div>
                  <div>Status: {trackingStatus}</div>
                  <div>Contents: {contents.length}</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </CameraPermission>
  )
}
