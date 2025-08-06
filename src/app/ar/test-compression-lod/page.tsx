'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ModelLoader } from '@/components/ar/ModelLoader'
import { ModelCompressionSettings } from '@/components/ar/ModelCompressionSettings'
import { LODSettings } from '@/components/ar/LODSettings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Info, Upload, Box, Activity } from 'lucide-react'
import type { CompressionOptions, CompressionResult } from '@/lib/ar/ModelCompressor'
import type { LODConfiguration, LODStatistics } from '@/lib/ar/LODManager'

export default function TestCompressionLODPage() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelLoaderRef = useRef<ModelLoader | null>(null)
  const currentModelRef = useRef<THREE.Object3D | null>(null)
  const animationIdRef = useRef<number | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isGeneratingLOD, setIsGeneratingLOD] = useState(false)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null)
  const [lodStatistics, setLodStatistics] = useState<LODStatistics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mountRef.current) return

    // Initialize Three.js scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 1, 3)
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

    // Axes helper
    const axesHelper = new THREE.AxesHelper(5)
    scene.add(axesHelper)

    // Initialize ModelLoader
    const modelLoader = new ModelLoader(renderer, camera, scene)
    modelLoaderRef.current = modelLoader

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)

      if (controlsRef.current) {
        controlsRef.current.update()
      }

      // Update LODs if available
      if (modelLoaderRef.current) {
        modelLoaderRef.current.updateLODs()

        // Get LOD statistics
        const stats = modelLoaderRef.current.getLODStatistics()
        setLodStatistics(stats)
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return

      cameraRef.current.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }

      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement)
      }

      rendererRef.current?.dispose()
      modelLoaderRef.current?.dispose()
    }
  }, [])

  const loadSampleModel = useCallback(async () => {
    if (!modelLoaderRef.current || !sceneRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      // Remove existing model
      if (currentModelRef.current) {
        sceneRef.current.remove(currentModelRef.current)
      }

      // Create a sample model (cube with texture)
      const geometry = new THREE.BoxGeometry(1, 1, 1)
      const textureLoader = new THREE.TextureLoader()

      // Create a simple colored material
      const material = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        roughness: 0.5,
        metalness: 0.3,
      })

      const cube = new THREE.Mesh(geometry, material)
      cube.castShadow = true
      cube.receiveShadow = true

      // Create a group to hold the model
      const model = new THREE.Group()
      model.add(cube)

      // Add some child meshes for complexity
      for (let i = 0; i < 3; i++) {
        const childGeometry = new THREE.SphereGeometry(0.2, 32, 32)
        const childMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(i / 3, 1, 0.5),
          roughness: 0.7,
          metalness: 0.2,
        })
        const childMesh = new THREE.Mesh(childGeometry, childMaterial)
        childMesh.position.set(
          Math.cos((i / 3) * Math.PI * 2) * 0.8,
          0,
          Math.sin((i / 3) * Math.PI * 2) * 0.8
        )
        childMesh.castShadow = true
        childMesh.receiveShadow = true
        model.add(childMesh)
      }

      sceneRef.current.add(model)
      currentModelRef.current = model
      setModelLoaded(true)
    } catch (err) {
      console.error('Failed to load model:', err)
      setError(err instanceof Error ? err.message : 'Failed to load model')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !modelLoaderRef.current || !sceneRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      // Remove existing model
      if (currentModelRef.current) {
        sceneRef.current.remove(currentModelRef.current)
      }

      const url = URL.createObjectURL(file)
      const model = await modelLoaderRef.current.loadModel({
        url,
        scale: 1,
        position: [0, 0, 0],
      })

      sceneRef.current.add(model)
      currentModelRef.current = model
      setModelLoaded(true)

      // Cleanup
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to load model:', err)
      setError(err instanceof Error ? err.message : 'Failed to load model')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleCompress = useCallback(async (options: CompressionOptions) => {
    if (!currentModelRef.current || !modelLoaderRef.current) return

    setIsCompressing(true)
    setError(null)

    try {
      const result = await modelLoaderRef.current.compressModel(currentModelRef.current, options)
      setCompressionResult(result)

      // Replace current model with compressed version
      if (sceneRef.current) {
        sceneRef.current.remove(currentModelRef.current)
        sceneRef.current.add(result.model)
        currentModelRef.current = result.model
      }
    } catch (err) {
      console.error('Compression failed:', err)
      setError(err instanceof Error ? err.message : 'Compression failed')
    } finally {
      setIsCompressing(false)
    }
  }, [])

  const handleLODConfiguration = useCallback(async (config: LODConfiguration) => {
    if (!currentModelRef.current || !modelLoaderRef.current || !sceneRef.current) return

    setIsGeneratingLOD(true)
    setError(null)

    try {
      // Remove existing model
      sceneRef.current.remove(currentModelRef.current)

      // Create LOD
      const lodId = `test_lod_${Date.now()}`
      const lod = await modelLoaderRef.current.createLOD(lodId, currentModelRef.current, config)

      sceneRef.current.add(lod)
      currentModelRef.current = lod
    } catch (err) {
      console.error('LOD generation failed:', err)
      setError(err instanceof Error ? err.message : 'LOD generation failed')
    } finally {
      setIsGeneratingLOD(false)
    }
  }, [])

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">3D Model Compression & LOD Test</h1>
        <p className="text-muted-foreground">
          Test model compression and Level of Detail (LOD) functionality
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Viewer */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  3D Model Viewer
                </span>
                {modelLoaded && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Model Loaded
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Load a model to test compression and LOD features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Model Loading Controls */}
                <div className="flex gap-2">
                  <Button onClick={loadSampleModel} disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Load Sample Model'}
                  </Button>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".glb,.gltf,.fbx,.obj"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isLoading}
                    />
                    <Button variant="outline" disabled={isLoading}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Model
                    </Button>
                  </div>
                </div>

                {/* 3D Canvas */}
                <div ref={mountRef} className="w-full h-[500px] bg-gray-100 rounded-lg border" />

                {/* LOD Statistics */}
                {lodStatistics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground text-xs">LOD Level</p>
                      <p className="font-semibold">{lodStatistics.currentLevel + 1}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground text-xs">FPS</p>
                      <p className="font-semibold">{lodStatistics.fps}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground text-xs">Vertices</p>
                      <p className="font-semibold">
                        {lodStatistics.activeVertices.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground text-xs">Memory</p>
                      <p className="font-semibold">{lodStatistics.memoryUsage.toFixed(1)} MB</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        <div>
          <Tabs defaultValue="compression" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compression">Compression</TabsTrigger>
              <TabsTrigger value="lod">LOD</TabsTrigger>
            </TabsList>

            <TabsContent value="compression">
              <ModelCompressionSettings
                onCompress={handleCompress}
                compressionResult={compressionResult}
                isCompressing={isCompressing}
              />
            </TabsContent>

            <TabsContent value="lod">
              <LODSettings
                onConfigurationChange={handleLODConfiguration}
                statistics={lodStatistics}
                onGenerateLOD={() => {}}
                isGenerating={isGeneratingLOD}
              />
            </TabsContent>
          </Tabs>

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Load a 3D model first, then experiment with compression settings and LOD
              configurations to optimize performance.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}
