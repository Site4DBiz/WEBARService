'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { Loader2, AlertCircle } from 'lucide-react'

interface ModelViewerProps {
  modelUrl: string
  scale?: number
  position?: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
  enableAnimation?: boolean
  enableInteraction?: boolean
  backgroundColor?: string
}

export default function ModelViewer({
  modelUrl,
  scale = 1,
  position = { x: 0, y: 0, z: 0 },
  rotation = { x: 0, y: 0, z: 0 },
  enableAnimation = true,
  enableInteraction = true,
  backgroundColor = '#f3f4f6',
}: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const animationIdRef = useRef<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return

    // シーンのセットアップ
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(backgroundColor)
    sceneRef.current = scene

    // カメラのセットアップ
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 1, 5)
    cameraRef.current = camera

    // レンダラーのセットアップ
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // ライティング
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -10
    directionalLight.shadow.camera.right = 10
    directionalLight.shadow.camera.top = 10
    directionalLight.shadow.camera.bottom = -10
    scene.add(directionalLight)

    // グリッドヘルパー
    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc)
    scene.add(gridHelper)

    // コントロール
    if (enableInteraction) {
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.screenSpacePanning = false
      controls.minDistance = 1
      controls.maxDistance = 20
      controls.maxPolarAngle = Math.PI / 2
      controlsRef.current = controls
    }

    // モデルのロード
    loadModel()

    // アニメーションループ
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)

      if (mixerRef.current && enableAnimation) {
        mixerRef.current.update(0.016)
      }

      if (controlsRef.current) {
        controlsRef.current.update()
      }

      if (modelRef.current && enableAnimation) {
        modelRef.current.rotation.y += 0.005
      }

      renderer.render(scene, camera)
    }
    animate()

    // リサイズハンドラー
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
    }
  }, [backgroundColor, enableAnimation, enableInteraction])

  const loadModel = async () => {
    if (!sceneRef.current) return

    setLoading(true)
    setError(null)
    setLoadingProgress(0)

    try {
      const extension = modelUrl.split('.').pop()?.toLowerCase()
      let loader: GLTFLoader | FBXLoader | OBJLoader

      switch (extension) {
        case 'glb':
        case 'gltf':
          loader = new GLTFLoader()
          // DRACOローダーの設定
          const dracoLoader = new DRACOLoader()
          dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
          ;(loader as GLTFLoader).setDRACOLoader(dracoLoader)
          break
        case 'fbx':
          loader = new FBXLoader()
          break
        case 'obj':
          loader = new OBJLoader()
          break
        default:
          throw new Error(`サポートされていないファイル形式: ${extension}`)
      }

      const onProgress = (xhr: ProgressEvent) => {
        if (xhr.lengthComputable) {
          const percentComplete = (xhr.loaded / xhr.total) * 100
          setLoadingProgress(Math.round(percentComplete))
        }
      }

      const onError = (error: any) => {
        console.error('モデル読み込みエラー:', error)
        setError('3Dモデルの読み込みに失敗しました')
        setLoading(false)
      }

      if (loader instanceof GLTFLoader) {
        loader.load(
          modelUrl,
          (gltf) => {
            if (modelRef.current) {
              sceneRef.current?.remove(modelRef.current)
            }

            const model = gltf.scene
            model.scale.setScalar(scale)
            model.position.set(position.x, position.y, position.z)
            model.rotation.set(rotation.x, rotation.y, rotation.z)

            // 影の設定
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true
                child.receiveShadow = true
              }
            })

            sceneRef.current?.add(model)
            modelRef.current = model

            // アニメーションの設定
            if (gltf.animations && gltf.animations.length > 0 && enableAnimation) {
              const mixer = new THREE.AnimationMixer(model)
              mixerRef.current = mixer
              gltf.animations.forEach((clip) => {
                mixer.clipAction(clip).play()
              })
            }

            // カメラ位置の調整
            const box = new THREE.Box3().setFromObject(model)
            const center = box.getCenter(new THREE.Vector3())
            const size = box.getSize(new THREE.Vector3())
            const maxDim = Math.max(size.x, size.y, size.z)
            const fov = cameraRef.current?.fov || 45
            const cameraDistance = maxDim / (2 * Math.tan((fov * Math.PI) / 360))
            cameraRef.current?.position.set(center.x, center.y, center.z + cameraDistance * 2)
            cameraRef.current?.lookAt(center)

            setLoading(false)
          },
          onProgress,
          onError
        )
      } else if (loader instanceof FBXLoader) {
        loader.load(
          modelUrl,
          (fbx) => {
            if (modelRef.current) {
              sceneRef.current?.remove(modelRef.current)
            }

            fbx.scale.setScalar(scale * 0.01) // FBXは通常大きいのでスケール調整
            fbx.position.set(position.x, position.y, position.z)
            fbx.rotation.set(rotation.x, rotation.y, rotation.z)

            fbx.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true
                child.receiveShadow = true
              }
            })

            sceneRef.current?.add(fbx)
            modelRef.current = fbx

            // アニメーションの設定
            if ((fbx as any).animations && (fbx as any).animations.length > 0 && enableAnimation) {
              const mixer = new THREE.AnimationMixer(fbx)
              mixerRef.current = mixer
              ;(fbx as any).animations.forEach((clip: THREE.AnimationClip) => {
                mixer.clipAction(clip).play()
              })
            }

            setLoading(false)
          },
          onProgress,
          onError
        )
      } else if (loader instanceof OBJLoader) {
        loader.load(
          modelUrl,
          (obj) => {
            if (modelRef.current) {
              sceneRef.current?.remove(modelRef.current)
            }

            obj.scale.setScalar(scale)
            obj.position.set(position.x, position.y, position.z)
            obj.rotation.set(rotation.x, rotation.y, rotation.z)

            obj.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true
                child.receiveShadow = true
                // デフォルトマテリアルを設定
                ;(child as THREE.Mesh).material = new THREE.MeshPhongMaterial({
                  color: 0x888888,
                })
              }
            })

            sceneRef.current?.add(obj)
            modelRef.current = obj

            setLoading(false)
          },
          onProgress,
          onError
        )
      }
    } catch (err: any) {
      setError(err.message || '予期しないエラーが発生しました')
      setLoading(false)
    }
  }

  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.scale.setScalar(scale)
      modelRef.current.position.set(position.x, position.y, position.z)
      modelRef.current.rotation.set(rotation.x, rotation.y, rotation.z)
    }
  }, [scale, position, rotation])

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90 z-10">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600 mb-4" />
          <p className="text-gray-600">3Dモデルを読み込み中...</p>
          {loadingProgress > 0 && (
            <div className="mt-4 w-64">
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2 text-center">{loadingProgress}%</p>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}