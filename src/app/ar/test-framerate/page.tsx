'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  RotateCw, 
  Zap,
  Box,
  Circle,
  Triangle,
  Sparkles,
  Settings
} from 'lucide-react'
import { FrameRateOptimizer } from '@/lib/ar/FrameRateOptimizer'
import { RenderingOptimizer } from '@/lib/ar/RenderingOptimizer'
import { PerformanceMonitor } from '@/components/ar/PerformanceMonitor'

export default function TestFrameRatePage() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const controlsRef = useRef<OrbitControls>()
  const frameOptimizerRef = useRef<FrameRateOptimizer>()
  const renderOptimizerRef = useRef<RenderingOptimizer>()
  const meshesRef = useRef<THREE.Mesh[]>([])
  const particleSystemRef = useRef<THREE.Points>()

  const [isRunning, setIsRunning] = useState(true)
  const [objectCount, setObjectCount] = useState(50)
  const [particleCount, setParticleCount] = useState(1000)
  const [rotationSpeed, setRotationSpeed] = useState(1)
  const [enableShadows, setEnableShadows] = useState(true)
  const [enableParticles, setEnableParticles] = useState(true)
  const [enablePostProcessing, setEnablePostProcessing] = useState(false)
  const [objectType, setObjectType] = useState<'cube' | 'sphere' | 'mixed'>('mixed')
  const [enableFrustumCulling, setEnableFrustumCulling] = useState(true)
  const [enableBatching, setEnableBatching] = useState(true)
  const [enableInstancing, setEnableInstancing] = useState(true)

  useEffect(() => {
    if (!mountRef.current) return

    // Initialize scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)
    scene.fog = new THREE.Fog(0x111111, 10, 100)
    sceneRef.current = scene

    // Initialize renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    renderer.shadowMap.enabled = enableShadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Initialize camera
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 10, 20)
    cameraRef.current = camera

    // Initialize controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controlsRef.current = controls

    // Initialize optimizers
    const frameOptimizer = new FrameRateOptimizer({
      targetFPS: 60,
      adaptiveQuality: true,
      frameSkipping: true,
      smoothing: true,
      monitoring: true
    })
    frameOptimizer.initialize(renderer, scene, camera)
    frameOptimizerRef.current = frameOptimizer

    const renderOptimizer = new RenderingOptimizer({
      enableFrustumCulling,
      enableOcclusionCulling: false,
      enableBatching,
      enableInstancing,
      enableShadowOptimization: true
    })
    renderOptimizer.initialize(renderer, scene, camera)
    renderOptimizerRef.current = renderOptimizer

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.left = -20
    directionalLight.shadow.camera.right = 20
    directionalLight.shadow.camera.top = 20
    directionalLight.shadow.camera.bottom = -20
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    // Add ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100)
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222,
      roughness: 0.8,
      metalness: 0.2
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    // Create objects
    createObjects()

    // Create particle system
    if (enableParticles) {
      createParticleSystem()
    }

    // Start animation
    frameOptimizer.onUpdate((delta) => {
      // Update controls
      controls.update()

      // Rotate objects
      meshesRef.current.forEach((mesh, index) => {
        mesh.rotation.x += delta * rotationSpeed * 0.5
        mesh.rotation.y += delta * rotationSpeed
        
        // Animate position
        const time = Date.now() * 0.001
        mesh.position.y = Math.sin(time + index) * 2 + 5
      })

      // Update particles
      if (particleSystemRef.current) {
        particleSystemRef.current.rotation.y += delta * 0.1
        const positions = particleSystemRef.current.geometry.attributes.position as THREE.BufferAttribute
        const count = positions.count
        
        for (let i = 0; i < count; i++) {
          const y = positions.getY(i)
          positions.setY(i, (y + delta * 2) % 20)
        }
        positions.needsUpdate = true
      }

      // Optimize rendering
      renderOptimizer.optimize()
    })

    frameOptimizer.start()

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      frameOptimizer.dispose()
      renderOptimizer.dispose()
      controls.dispose()
      renderer.dispose()
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  const createObjects = () => {
    // Clear existing objects
    meshesRef.current.forEach(mesh => {
      sceneRef.current?.remove(mesh)
      mesh.geometry.dispose()
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose()
      }
    })
    meshesRef.current = []

    // Create new objects
    for (let i = 0; i < objectCount; i++) {
      let geometry: THREE.BufferGeometry
      
      if (objectType === 'cube' || (objectType === 'mixed' && i % 2 === 0)) {
        geometry = new THREE.BoxGeometry(1, 1, 1)
      } else {
        geometry = new THREE.SphereGeometry(0.5, 16, 16)
      }

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(i / objectCount, 0.7, 0.5),
        roughness: 0.4,
        metalness: 0.6
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(
        (Math.random() - 0.5) * 30,
        Math.random() * 10 + 2,
        (Math.random() - 0.5) * 30
      )
      mesh.castShadow = true
      mesh.receiveShadow = true

      sceneRef.current?.add(mesh)
      meshesRef.current.push(mesh)
    }
  }

  const createParticleSystem = () => {
    if (particleSystemRef.current) {
      sceneRef.current?.remove(particleSystemRef.current)
      particleSystemRef.current.geometry.dispose()
      if (particleSystemRef.current.material instanceof THREE.Material) {
        particleSystemRef.current.material.dispose()
      }
    }

    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40
      positions[i * 3 + 1] = Math.random() * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40

      colors[i * 3] = Math.random()
      colors[i * 3 + 1] = Math.random()
      colors[i * 3 + 2] = Math.random()
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    })

    const particles = new THREE.Points(geometry, material)
    particleSystemRef.current = particles
    sceneRef.current?.add(particles)
  }

  const handleObjectCountChange = (value: number[]) => {
    setObjectCount(value[0])
    createObjects()
  }

  const handleParticleCountChange = (value: number[]) => {
    setParticleCount(value[0])
    if (enableParticles) {
      createParticleSystem()
    }
  }

  const handleRotationSpeedChange = (value: number[]) => {
    setRotationSpeed(value[0])
  }

  const handleShadowToggle = (checked: boolean) => {
    setEnableShadows(checked)
    if (rendererRef.current) {
      rendererRef.current.shadowMap.enabled = checked
    }
  }

  const handleParticlesToggle = (checked: boolean) => {
    setEnableParticles(checked)
    if (checked) {
      createParticleSystem()
    } else if (particleSystemRef.current) {
      sceneRef.current?.remove(particleSystemRef.current)
      particleSystemRef.current.geometry.dispose()
      if (particleSystemRef.current.material instanceof THREE.Material) {
        particleSystemRef.current.material.dispose()
      }
      particleSystemRef.current = undefined
    }
  }

  const handlePlayPause = () => {
    if (isRunning) {
      frameOptimizerRef.current?.stop()
    } else {
      frameOptimizerRef.current?.start()
    }
    setIsRunning(!isRunning)
  }

  const handleReset = () => {
    frameOptimizerRef.current?.reset()
    createObjects()
    if (enableParticles) {
      createParticleSystem()
    }
  }

  const handleFrustumCullingToggle = (checked: boolean) => {
    setEnableFrustumCulling(checked)
    renderOptimizerRef.current?.setConfig({ enableFrustumCulling: checked })
  }

  const handleBatchingToggle = (checked: boolean) => {
    setEnableBatching(checked)
    renderOptimizerRef.current?.setConfig({ enableBatching: checked })
  }

  const handleInstancingToggle = (checked: boolean) => {
    setEnableInstancing(checked)
    renderOptimizerRef.current?.setConfig({ enableInstancing: checked })
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Frame Rate Optimization Test</CardTitle>
          <CardDescription>
            Test and visualize frame rate optimization techniques
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* 3D Scene */}
            <div className="lg:col-span-3">
              <div 
                ref={mountRef} 
                className="w-full h-[500px] bg-gray-900 rounded-lg relative"
              />
              <PerformanceMonitor
                frameOptimizer={frameOptimizerRef.current}
                renderOptimizer={renderOptimizerRef.current}
                position="top-right"
                expanded={true}
              />
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {/* Playback Controls */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Playback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePlayPause}
                      size="sm"
                      variant={isRunning ? 'default' : 'secondary'}
                    >
                      {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {isRunning ? 'Pause' : 'Play'}
                    </Button>
                    <Button onClick={handleReset} size="sm" variant="outline">
                      <RotateCw className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Scene Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Scene Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Object Type</Label>
                    <Select value={objectType} onValueChange={(value: any) => setObjectType(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cube">
                          <div className="flex items-center gap-2">
                            <Box className="h-4 w-4" />
                            Cubes
                          </div>
                        </SelectItem>
                        <SelectItem value="sphere">
                          <div className="flex items-center gap-2">
                            <Circle className="h-4 w-4" />
                            Spheres
                          </div>
                        </SelectItem>
                        <SelectItem value="mixed">
                          <div className="flex items-center gap-2">
                            <Triangle className="h-4 w-4" />
                            Mixed
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">
                      Objects: {objectCount}
                    </Label>
                    <Slider
                      value={[objectCount]}
                      onValueChange={handleObjectCountChange}
                      min={10}
                      max={500}
                      step={10}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">
                      Particles: {particleCount}
                    </Label>
                    <Slider
                      value={[particleCount]}
                      onValueChange={handleParticleCountChange}
                      min={0}
                      max={10000}
                      step={100}
                      className="mt-1"
                      disabled={!enableParticles}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">
                      Rotation Speed: {rotationSpeed.toFixed(1)}x
                    </Label>
                    <Slider
                      value={[rotationSpeed]}
                      onValueChange={handleRotationSpeedChange}
                      min={0}
                      max={5}
                      step={0.1}
                      className="mt-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="shadows" className="text-xs">Shadows</Label>
                      <Switch
                        id="shadows"
                        checked={enableShadows}
                        onCheckedChange={handleShadowToggle}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="particles" className="text-xs">Particles</Label>
                      <Switch
                        id="particles"
                        checked={enableParticles}
                        onCheckedChange={handleParticlesToggle}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Optimization Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Optimizations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="frustum" className="text-xs">Frustum Culling</Label>
                    <Switch
                      id="frustum"
                      checked={enableFrustumCulling}
                      onCheckedChange={handleFrustumCullingToggle}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="batching" className="text-xs">Batching</Label>
                    <Switch
                      id="batching"
                      checked={enableBatching}
                      onCheckedChange={handleBatchingToggle}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="instancing" className="text-xs">Instancing</Label>
                    <Switch
                      id="instancing"
                      checked={enableInstancing}
                      onCheckedChange={handleInstancingToggle}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Info */}
              <div className="space-y-2">
                <Badge variant="outline" className="w-full justify-center">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Adaptive Quality Enabled
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}