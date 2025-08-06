'use client'

import React, { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MemoryMonitor } from '@/components/ar/MemoryMonitor'
import { MemoryProfiler } from '@/lib/ar/MemoryProfiler'
import { ObjectPoolManager, Vector3Pool, MeshPool } from '@/lib/ar/ObjectPool'
import { ModelMemoryManager } from '@/lib/ar/ModelMemoryManager'
import { GarbageCollectionManager } from '@/lib/ar/GarbageCollectionManager'
import { TextureCache } from '@/lib/ar/TextureOptimizer'

// Test scene component
function TestScene({ 
  objectCount, 
  usePooling, 
  textureSize,
  animationSpeed 
}: { 
  objectCount: number
  usePooling: boolean
  textureSize: number
  animationSpeed: number
}) {
  const meshesRef = useRef<THREE.Mesh[]>([])
  const { scene, gl } = useThree()
  const poolManager = useRef(ObjectPoolManager.getInstance())
  const meshPool = useRef(poolManager.current.getMeshPool())

  useEffect(() => {
    // Clear existing meshes
    meshesRef.current.forEach(mesh => {
      scene.remove(mesh)
      if (usePooling) {
        meshPool.current.release('testMesh', mesh as any)
      } else {
        mesh.geometry.dispose()
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose()
        }
      }
    })
    meshesRef.current = []

    // Create test geometry and material if not using pooling
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const texture = new THREE.DataTexture(
      new Uint8Array(textureSize * textureSize * 4).fill(255),
      textureSize,
      textureSize
    )
    const material = new THREE.MeshPhongMaterial({ map: texture })

    // Create mesh pool if using pooling
    if (usePooling && !meshPool.current.getAllStats().has('testMesh')) {
      meshPool.current.createPool('testMesh', geometry, material, {
        initialSize: 50,
        maxSize: 500
      })
    }

    // Create new meshes
    for (let i = 0; i < objectCount; i++) {
      let mesh: THREE.Mesh

      if (usePooling) {
        const pooledMesh = meshPool.current.acquire('testMesh')
        if (pooledMesh) {
          mesh = pooledMesh as unknown as THREE.Mesh
        } else {
          // Fallback if pool is exhausted
          mesh = new THREE.Mesh(geometry.clone(), material.clone())
        }
      } else {
        mesh = new THREE.Mesh(geometry.clone(), material.clone())
      }

      mesh.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      )
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      )

      scene.add(mesh)
      meshesRef.current.push(mesh)
    }

    return () => {
      // Cleanup
      meshesRef.current.forEach(mesh => {
        scene.remove(mesh)
        if (usePooling) {
          meshPool.current.release('testMesh', mesh as any)
        } else {
          mesh.geometry.dispose()
          if (mesh.material instanceof THREE.Material) {
            mesh.material.dispose()
          }
        }
      })
      meshesRef.current = []
    }
  }, [objectCount, usePooling, textureSize, scene])

  // Animate meshes
  useFrame((state, delta) => {
    if (animationSpeed > 0) {
      meshesRef.current.forEach((mesh, i) => {
        mesh.rotation.x += delta * animationSpeed * 0.5
        mesh.rotation.y += delta * animationSpeed * 0.3
        mesh.position.y = Math.sin(state.clock.elapsedTime + i) * 2
      })
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
    </>
  )
}

export default function TestMemoryOptimizationPage() {
  const [objectCount, setObjectCount] = useState(100)
  const [usePooling, setUsePooling] = useState(true)
  const [textureSize, setTextureSize] = useState(256)
  const [animationSpeed, setAnimationSpeed] = useState(1)
  const [gcMode, setGcMode] = useState<'aggressive' | 'balanced' | 'conservative'>('balanced')
  const [autoGC, setAutoGC] = useState(true)
  const [testResults, setTestResults] = useState<any[]>([])
  const [isRunningTest, setIsRunningTest] = useState(false)

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const profilerRef = useRef<MemoryProfiler | null>(null)
  const gcManagerRef = useRef<GarbageCollectionManager | null>(null)

  useEffect(() => {
    profilerRef.current = new MemoryProfiler()
    gcManagerRef.current = new GarbageCollectionManager({
      performanceMode: gcMode,
      enableAutoGC: autoGC
    })

    return () => {
      profilerRef.current?.cleanup()
      gcManagerRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    if (gcManagerRef.current) {
      gcManagerRef.current.setPerformanceMode(gcMode)
    }
  }, [gcMode])

  const runMemoryTest = async () => {
    setIsRunningTest(true)
    const results = []

    // Test different configurations
    const configurations = [
      { objects: 50, pooling: false, texture: 128 },
      { objects: 50, pooling: true, texture: 128 },
      { objects: 100, pooling: false, texture: 256 },
      { objects: 100, pooling: true, texture: 256 },
      { objects: 200, pooling: false, texture: 512 },
      { objects: 200, pooling: true, texture: 512 },
    ]

    for (const config of configurations) {
      setObjectCount(config.objects)
      setUsePooling(config.pooling)
      setTextureSize(config.texture)

      // Wait for scene to update
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Take memory snapshot
      const snapshot = profilerRef.current?.takeSnapshot()
      if (snapshot) {
        results.push({
          config,
          memory: snapshot.memory,
          resources: snapshot.resources,
          timestamp: new Date(snapshot.timestamp)
        })
      }

      // Run GC between tests
      gcManagerRef.current?.performGC()
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setTestResults(results)
    setIsRunningTest(false)
  }

  const clearAllResources = () => {
    ObjectPoolManager.getInstance().clearAll()
    gcManagerRef.current?.forceReleaseAll()
    profilerRef.current?.cleanup()
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Memory Optimization Test</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Scene */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>3D Test Scene</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] bg-gray-100 rounded">
                <Canvas
                  camera={{ position: [0, 0, 30], fov: 75 }}
                  onCreated={({ gl }) => {
                    rendererRef.current = gl
                    if (profilerRef.current) {
                      profilerRef.current.setRenderer(gl)
                    }
                    if (gcManagerRef.current) {
                      gcManagerRef.current.setRenderer(gl)
                    }
                  }}
                >
                  <TestScene
                    objectCount={objectCount}
                    usePooling={usePooling}
                    textureSize={textureSize}
                    animationSpeed={animationSpeed}
                  />
                  <OrbitControls />
                  <Stats />
                </Canvas>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Memory Monitor */}
        <div>
          <MemoryMonitor 
            renderer={rendererRef.current || undefined}
            autoRefresh={true}
            refreshInterval={1000}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Scene Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Object Count: {objectCount}</Label>
              <Slider
                value={[objectCount]}
                onValueChange={([value]) => setObjectCount(value)}
                min={10}
                max={500}
                step={10}
              />
            </div>

            <div className="space-y-2">
              <Label>Texture Size: {textureSize}x{textureSize}</Label>
              <Slider
                value={[textureSize]}
                onValueChange={([value]) => setTextureSize(value)}
                min={64}
                max={1024}
                step={64}
              />
            </div>

            <div className="space-y-2">
              <Label>Animation Speed: {animationSpeed.toFixed(1)}</Label>
              <Slider
                value={[animationSpeed]}
                onValueChange={([value]) => setAnimationSpeed(value)}
                min={0}
                max={3}
                step={0.1}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={usePooling}
                onCheckedChange={setUsePooling}
              />
              <Label>Use Object Pooling</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Memory Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>GC Mode</Label>
              <Tabs value={gcMode} onValueChange={(v) => setGcMode(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="aggressive">Aggressive</TabsTrigger>
                  <TabsTrigger value="balanced">Balanced</TabsTrigger>
                  <TabsTrigger value="conservative">Conservative</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={autoGC}
                onCheckedChange={setAutoGC}
              />
              <Label>Auto Garbage Collection</Label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => gcManagerRef.current?.performGC()}
                variant="outline"
              >
                Manual GC
              </Button>
              <Button
                onClick={clearAllResources}
                variant="outline"
              >
                Clear All
              </Button>
            </div>

            <Button
              onClick={runMemoryTest}
              disabled={isRunningTest}
              className="w-full"
            >
              {isRunningTest ? 'Running Test...' : 'Run Memory Test'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Objects</th>
                    <th className="text-left p-2">Pooling</th>
                    <th className="text-left p-2">Texture</th>
                    <th className="text-left p-2">Memory Used</th>
                    <th className="text-left p-2">Usage %</th>
                    <th className="text-left p-2">Geometries</th>
                    <th className="text-left p-2">Textures</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((result, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{result.config.objects}</td>
                      <td className="p-2">{result.config.pooling ? 'Yes' : 'No'}</td>
                      <td className="p-2">{result.config.texture}px</td>
                      <td className="p-2">
                        {(result.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="p-2">{result.memory.percentageUsed.toFixed(1)}%</td>
                      <td className="p-2">{result.resources.geometries}</td>
                      <td className="p-2">{result.resources.textures}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Alert className="mt-4">
              <AlertDescription>
                Object pooling reduces memory usage by up to{' '}
                {testResults.length >= 2 
                  ? ((1 - testResults[1].memory.usedJSHeapSize / testResults[0].memory.usedJSHeapSize) * 100).toFixed(0)
                  : '0'}% compared to creating new objects.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}