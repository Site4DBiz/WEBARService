'use client'

import React, { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Info, Upload, Download, Play, Pause } from 'lucide-react'
import TextureSettings from '@/components/ar/TextureSettings'
import { ModelLoader } from '@/components/ar/ModelLoader'
import { TextureStats } from '@/lib/ar/TextureOptimizer'

export default function TestTextureOptimizationPage() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelLoaderRef = useRef<ModelLoader | null>(null)
  const frameIdRef = useRef<number | null>(null)
  const currentModelRef = useRef<THREE.Group | null>(null)

  const [isInitialized, setIsInitialized] = useState(false)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [textureStats, setTextureStats] = useState<TextureStats[]>([])
  const [originalStats, setOriginalStats] = useState<TextureStats[]>([])
  const [isAnimating, setIsAnimating] = useState(true)
  const [performanceStats, setPerformanceStats] = useState({
    fps: 0,
    memory: 0,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
  })

  useEffect(() => {
    if (!mountRef.current || isInitialized) return

    initializeScene()
    setIsInitialized(true)

    return () => {
      cleanup()
    }
  }, [])

  const initializeScene = () => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    scene.fog = new THREE.Fog(0xf0f0f0, 1, 100)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      100
    )
    camera.position.set(2, 2, 5)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.target.set(0, 0, 0)
    controls.update()
    controlsRef.current = controls

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
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
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc)
    scene.add(gridHelper)

    // Initialize model loader
    modelLoaderRef.current = new ModelLoader(renderer, camera, scene)

    // Add default test cube with texture
    addTestCube()

    // Start animation
    animate()

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)
  }

  const addTestCube = () => {
    if (!sceneRef.current) return

    // Create cube with texture
    const geometry = new THREE.BoxGeometry(1, 1, 1)

    // Create texture
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Draw test pattern
    const gradient = ctx.createLinearGradient(0, 0, 512, 512)
    gradient.addColorStop(0, '#ff0000')
    gradient.addColorStop(0.5, '#00ff00')
    gradient.addColorStop(1, '#0000ff')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)

    // Add text
    ctx.fillStyle = 'white'
    ctx.font = '48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Test Texture', 256, 256)

    const texture = new THREE.CanvasTexture(canvas)
    texture.generateMipmaps = true

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.5,
      metalness: 0.1,
    })

    const cube = new THREE.Mesh(geometry, material)
    cube.castShadow = true
    cube.receiveShadow = true

    const group = new THREE.Group()
    group.add(cube)
    group.name = 'TestCube'

    sceneRef.current.add(group)
    currentModelRef.current = group
  }

  const animate = () => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return

    frameIdRef.current = requestAnimationFrame(animate)

    // Update controls
    if (controlsRef.current) {
      controlsRef.current.update()
    }

    // Rotate model
    if (currentModelRef.current && isAnimating) {
      currentModelRef.current.rotation.y += 0.005
    }

    // Update LODs if any
    if (modelLoaderRef.current) {
      modelLoaderRef.current.updateLODs()
    }

    // Update performance stats
    updatePerformanceStats()

    // Render
    rendererRef.current.render(sceneRef.current, cameraRef.current)
  }

  const updatePerformanceStats = () => {
    if (!rendererRef.current) return

    const info = rendererRef.current.info

    setPerformanceStats({
      fps: 60, // Approximate, would need proper FPS counter
      memory: info.memory.geometries + info.memory.textures,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      textures: info.memory.textures,
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setModelFile(file)
      const url = URL.createObjectURL(file)
      setModelUrl(url)
      loadModel(url)
    }
  }

  const loadModel = async (url: string) => {
    if (!modelLoaderRef.current || !sceneRef.current) return

    setIsLoading(true)
    setError(null)
    setTextureStats([])
    setOriginalStats([])

    try {
      // Remove current model
      if (currentModelRef.current) {
        sceneRef.current.remove(currentModelRef.current)
        currentModelRef.current = null
      }

      // Load model without optimization first to get original stats
      const originalResult = await modelLoaderRef.current.loadModelWithAnimations({
        url,
        scale: 1,
        position: [0, 0, 0],
        optimizeTextures: false,
      })

      // Collect original texture stats
      const originalTextureStats = await collectTextureStats(originalResult.model)
      setOriginalStats(originalTextureStats)

      // Load model with texture optimization
      const optimizedResult = await modelLoaderRef.current.loadModelWithAnimations({
        url,
        scale: 1,
        position: [0, 0, 0],
        optimizeTextures: true,
        textureOptions: {
          maxSize: 1024,
          quality: 85,
          format: 'webp',
          generateMipmaps: true,
          powerOfTwo: true,
          compress: true,
        },
      })

      if (optimizedResult.textureStats) {
        setTextureStats(optimizedResult.textureStats)
      }

      // Add to scene
      sceneRef.current.add(optimizedResult.model)
      currentModelRef.current = optimizedResult.model

      // Center model
      const box = new THREE.Box3().setFromObject(optimizedResult.model)
      const center = box.getCenter(new THREE.Vector3())
      optimizedResult.model.position.sub(center)
    } catch (err) {
      console.error('Failed to load model:', err)
      setError('モデルの読み込みに失敗しました')

      // Add test cube back
      addTestCube()
    } finally {
      setIsLoading(false)
    }
  }

  const collectTextureStats = async (model: THREE.Object3D): Promise<TextureStats[]> => {
    const stats: TextureStats[] = []
    const processedTextures = new Set<string>()

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as any

        if (material) {
          const textureProperties = [
            'map',
            'normalMap',
            'roughnessMap',
            'metalnessMap',
            'aoMap',
            'emissiveMap',
            'bumpMap',
            'displacementMap',
            'alphaMap',
            'envMap',
            'lightMap',
          ]

          textureProperties.forEach((prop) => {
            if (material[prop] && material[prop] instanceof THREE.Texture) {
              const texture = material[prop]
              if (!processedTextures.has(texture.uuid)) {
                processedTextures.add(texture.uuid)

                const width = texture.image?.width || 0
                const height = texture.image?.height || 0
                const channels = texture.format === THREE.RGBAFormat ? 4 : 3
                const size = width * height * channels

                stats.push({
                  originalSize: size,
                  optimizedSize: size,
                  compressionRatio: 0,
                  width,
                  height,
                  format: 'original',
                  hasAlpha: texture.format === THREE.RGBAFormat,
                })
              }
            }
          })
        }
      }
    })

    return stats
  }

  const handleOptimizeTexture = async (texture: THREE.Texture, stats: TextureStats) => {
    console.log('Texture optimized:', stats)

    // Update current model with optimized texture
    if (currentModelRef.current) {
      currentModelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as any
          if (material && material.map) {
            material.map = texture
            material.needsUpdate = true
          }
        }
      })
    }
  }

  const cleanup = () => {
    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current)
    }

    if (modelLoaderRef.current) {
      modelLoaderRef.current.dispose()
    }

    if (controlsRef.current) {
      controlsRef.current.dispose()
    }

    if (rendererRef.current) {
      rendererRef.current.dispose()
      if (mountRef.current && rendererRef.current.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement)
      }
    }

    if (modelUrl) {
      URL.revokeObjectURL(modelUrl)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">テクスチャ最適化テスト</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Viewer */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>3Dビューアー</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsAnimating(!isAnimating)}>
                    {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('model-file')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    モデル読み込み
                  </Button>
                  <input
                    id="model-file"
                    type="file"
                    accept=".glb,.gltf,.fbx,.obj"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={mountRef} className="w-full h-[500px] bg-gray-100 rounded" />
              {isLoading && (
                <div className="mt-4 text-center">
                  <p>モデルを読み込み中...</p>
                </div>
              )}
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Performance Stats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>パフォーマンス統計</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">FPS</p>
                  <p className="text-xl font-bold">{performanceStats.fps}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">メモリ</p>
                  <p className="text-xl font-bold">{performanceStats.memory}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ドローコール</p>
                  <p className="text-xl font-bold">{performanceStats.drawCalls}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">三角形</p>
                  <p className="text-xl font-bold">{performanceStats.triangles.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">テクスチャ</p>
                  <p className="text-xl font-bold">{performanceStats.textures}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Texture Comparison */}
          {textureStats.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>テクスチャ最適化結果</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {textureStats.map((stat, index) => {
                    const original = originalStats[index]
                    return (
                      <div key={index} className="border rounded p-4">
                        <h4 className="font-semibold mb-2">テクスチャ {index + 1}</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">元のサイズ</p>
                            <p className="font-medium">
                              {original ? formatFileSize(original.originalSize) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">最適化後</p>
                            <p className="font-medium text-green-600">
                              {formatFileSize(stat.optimizedSize)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">圧縮率</p>
                            <p className="font-medium">{stat.compressionRatio.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">解像度</p>
                            <p className="font-medium">
                              {stat.width} × {stat.height}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Total Summary */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">合計</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">元の合計サイズ</p>
                        <p className="font-medium">
                          {formatFileSize(
                            originalStats.reduce((sum, s) => sum + s.originalSize, 0)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">最適化後の合計</p>
                        <p className="font-medium text-green-600">
                          {formatFileSize(
                            textureStats.reduce((sum, s) => sum + s.optimizedSize, 0)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">平均圧縮率</p>
                        <p className="font-medium">
                          {(
                            textureStats.reduce((sum, s) => sum + s.compressionRatio, 0) /
                            textureStats.length
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <Tabs defaultValue="settings">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings">設定</TabsTrigger>
              <TabsTrigger value="info">情報</TabsTrigger>
            </TabsList>

            <TabsContent value="settings">
              <TextureSettings
                onOptimize={handleOptimizeTexture}
                onReset={() => {
                  setTextureStats([])
                  setOriginalStats([])
                }}
              />
            </TabsContent>

            <TabsContent value="info">
              <Card>
                <CardHeader>
                  <CardTitle>使用方法</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      このページでは、3Dモデルのテクスチャ最適化機能をテストできます。
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <h4 className="font-semibold">機能：</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>WebP、JPEG、PNG形式への変換</li>
                      <li>Basis Universal (KTX2)形式対応</li>
                      <li>品質レベルの調整（0-100%）</li>
                      <li>自動リサイズとミップマップ生成</li>
                      <li>Power of Twoサイズへの調整</li>
                      <li>テクスチャキャッシュシステム</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">操作方法：</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>「モデル読み込み」で3Dモデルを選択</li>
                      <li>設定タブで最適化オプションを調整</li>
                      <li>「最適化実行」で処理を開始</li>
                      <li>結果を確認して比較</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">対応フォーマット：</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>GLTF/GLB（推奨）</li>
                      <li>FBX</li>
                      <li>OBJ（MTLファイル対応）</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
