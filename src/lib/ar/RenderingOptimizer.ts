import * as THREE from 'three'
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils'

export interface RenderingConfig {
  enableFrustumCulling: boolean
  enableOcclusionCulling: boolean
  enableBatching: boolean
  enableInstancing: boolean
  maxDrawCalls: number
  maxTextureSize: number
  maxVertices: number
  enableLOD: boolean
  enableShadowOptimization: boolean
}

export interface RenderingStatistics {
  drawCalls: number
  triangles: number
  vertices: number
  textures: number
  programs: number
  geometries: number
  materials: number
  visibleObjects: number
  culledObjects: number
  batchedObjects: number
  instancedObjects: number
  memoryUsage: {
    geometries: number
    textures: number
    total: number
  }
}

interface BatchGroup {
  material: THREE.Material
  geometry: THREE.BufferGeometry
  meshes: THREE.Mesh[]
  batchedMesh?: THREE.Mesh
}

interface InstanceGroup {
  mesh: THREE.InstancedMesh
  instances: THREE.Object3D[]
  matrices: Float32Array
  colors?: Float32Array
}

export class RenderingOptimizer {
  private config: RenderingConfig
  private statistics: RenderingStatistics
  private frustum: THREE.Frustum
  private frustumMatrix: THREE.Matrix4
  private batchGroups: Map<string, BatchGroup>
  private instanceGroups: Map<string, InstanceGroup>
  private occlusionCuller: OcclusionCuller
  private shadowOptimizer: ShadowOptimizer
  private renderer?: THREE.WebGLRenderer
  private scene?: THREE.Scene
  private camera?: THREE.Camera

  constructor(config: Partial<RenderingConfig> = {}) {
    this.config = {
      enableFrustumCulling: true,
      enableOcclusionCulling: true,
      enableBatching: true,
      enableInstancing: true,
      maxDrawCalls: 100,
      maxTextureSize: 2048,
      maxVertices: 65536,
      enableLOD: true,
      enableShadowOptimization: true,
      ...config
    }

    this.statistics = {
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      textures: 0,
      programs: 0,
      geometries: 0,
      materials: 0,
      visibleObjects: 0,
      culledObjects: 0,
      batchedObjects: 0,
      instancedObjects: 0,
      memoryUsage: {
        geometries: 0,
        textures: 0,
        total: 0
      }
    }

    this.frustum = new THREE.Frustum()
    this.frustumMatrix = new THREE.Matrix4()
    this.batchGroups = new Map()
    this.instanceGroups = new Map()
    this.occlusionCuller = new OcclusionCuller()
    this.shadowOptimizer = new ShadowOptimizer()
  }

  public initialize(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ): void {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera

    // Enable renderer optimizations
    if (this.renderer) {
      this.renderer.sortObjects = true
      this.renderer.info.autoReset = true
    }

    // Initialize sub-optimizers
    this.occlusionCuller.initialize(renderer, scene, camera)
    this.shadowOptimizer.initialize(renderer, scene)
  }

  public optimize(): void {
    if (!this.scene || !this.camera || !this.renderer) return

    // Reset statistics
    this.resetStatistics()

    // Update frustum
    this.updateFrustum()

    // Perform culling
    if (this.config.enableFrustumCulling) {
      this.performFrustumCulling()
    }

    if (this.config.enableOcclusionCulling) {
      this.performOcclusionCulling()
    }

    // Optimize batching
    if (this.config.enableBatching) {
      this.optimizeBatching()
    }

    // Optimize instancing
    if (this.config.enableInstancing) {
      this.optimizeInstancing()
    }

    // Optimize shadows
    if (this.config.enableShadowOptimization) {
      this.shadowOptimizer.optimize()
    }

    // Update statistics
    this.updateStatistics()
  }

  private resetStatistics(): void {
    this.statistics.visibleObjects = 0
    this.statistics.culledObjects = 0
    this.statistics.batchedObjects = 0
    this.statistics.instancedObjects = 0
  }

  private updateFrustum(): void {
    if (!this.camera) return

    this.frustumMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    )
    this.frustum.setFromProjectionMatrix(this.frustumMatrix)
  }

  private performFrustumCulling(): void {
    if (!this.scene) return

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Group) {
        const wasVisible = object.visible

        // Check if object is in frustum
        if (object.geometry) {
          object.geometry.computeBoundingBox()
          const box = object.geometry.boundingBox
          if (box) {
            const worldBox = box.clone().applyMatrix4(object.matrixWorld)
            object.visible = this.frustum.intersectsBox(worldBox)
          }
        } else if (object instanceof THREE.Group) {
          const box = new THREE.Box3().setFromObject(object)
          object.visible = this.frustum.intersectsBox(box)
        }

        // Update statistics
        if (object.visible) {
          this.statistics.visibleObjects++
        } else if (wasVisible) {
          this.statistics.culledObjects++
        }
      }
    })
  }

  private performOcclusionCulling(): void {
    if (!this.scene || !this.camera) return

    const visibleObjects = this.occlusionCuller.cull(this.scene, this.camera)
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const wasVisible = object.visible
        object.visible = visibleObjects.has(object)
        
        if (!object.visible && wasVisible) {
          this.statistics.culledObjects++
        }
      }
    })
  }

  private optimizeBatching(): void {
    if (!this.scene) return

    // Clear existing batches
    this.batchGroups.clear()

    // Group meshes by material and geometry compatibility
    const meshes: THREE.Mesh[] = []
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.visible) {
        meshes.push(object)
      }
    })

    // Create batch groups
    meshes.forEach((mesh) => {
      const key = this.getBatchKey(mesh)
      if (!this.batchGroups.has(key)) {
        this.batchGroups.set(key, {
          material: mesh.material as THREE.Material,
          geometry: mesh.geometry,
          meshes: []
        })
      }
      this.batchGroups.get(key)!.meshes.push(mesh)
    })

    // Create batched meshes for groups with multiple meshes
    this.batchGroups.forEach((group, key) => {
      if (group.meshes.length > 1 && this.canBatch(group)) {
        this.createBatchedMesh(group)
        this.statistics.batchedObjects += group.meshes.length
      }
    })
  }

  private getBatchKey(mesh: THREE.Mesh): string {
    const material = mesh.material as THREE.Material
    const geometry = mesh.geometry
    return `${material.uuid}_${geometry.uuid}`
  }

  private canBatch(group: BatchGroup): boolean {
    // Check if total vertices don't exceed limit
    let totalVertices = 0
    group.meshes.forEach((mesh) => {
      const count = mesh.geometry.attributes.position?.count || 0
      totalVertices += count
    })
    return totalVertices <= this.config.maxVertices
  }

  private createBatchedMesh(group: BatchGroup): void {
    const geometries: THREE.BufferGeometry[] = []
    
    group.meshes.forEach((mesh) => {
      const geometry = mesh.geometry.clone()
      geometry.applyMatrix4(mesh.matrixWorld)
      geometries.push(geometry)
      mesh.visible = false // Hide original mesh
    })

    // Merge geometries
    const mergedGeometry = mergeBufferGeometries(geometries)
    if (mergedGeometry) {
      group.batchedMesh = new THREE.Mesh(mergedGeometry, group.material)
      if (this.scene) {
        this.scene.add(group.batchedMesh)
      }
    }
  }

  private optimizeInstancing(): void {
    if (!this.scene) return

    // Clear existing instances
    this.instanceGroups.clear()

    // Find meshes that can be instanced
    const meshMap = new Map<string, THREE.Mesh[]>()
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.visible) {
        const key = this.getInstanceKey(object)
        if (!meshMap.has(key)) {
          meshMap.set(key, [])
        }
        meshMap.get(key)!.push(object)
      }
    })

    // Create instanced meshes for groups with multiple identical meshes
    meshMap.forEach((meshes, key) => {
      if (meshes.length > 2) { // Only instance if we have more than 2 meshes
        this.createInstancedMesh(meshes)
        this.statistics.instancedObjects += meshes.length
      }
    })
  }

  private getInstanceKey(mesh: THREE.Mesh): string {
    const geometry = mesh.geometry
    const material = mesh.material as THREE.Material
    return `inst_${geometry.uuid}_${material.uuid}`
  }

  private createInstancedMesh(meshes: THREE.Mesh[]): void {
    if (meshes.length === 0) return

    const firstMesh = meshes[0]
    const count = meshes.length

    // Create instanced mesh
    const instancedMesh = new THREE.InstancedMesh(
      firstMesh.geometry,
      firstMesh.material as THREE.Material,
      count
    )

    // Set instance matrices
    const matrix = new THREE.Matrix4()
    meshes.forEach((mesh, index) => {
      matrix.copy(mesh.matrixWorld)
      instancedMesh.setMatrixAt(index, matrix)
      mesh.visible = false // Hide original mesh
    })

    instancedMesh.instanceMatrix.needsUpdate = true

    if (this.scene) {
      this.scene.add(instancedMesh)
    }

    // Store instance group for later updates
    this.instanceGroups.set(instancedMesh.uuid, {
      mesh: instancedMesh,
      instances: meshes,
      matrices: new Float32Array(count * 16)
    })
  }

  private updateStatistics(): void {
    if (!this.renderer) return

    const info = this.renderer.info
    
    this.statistics.drawCalls = info.render.calls
    this.statistics.triangles = info.render.triangles
    this.statistics.vertices = info.render.points
    this.statistics.textures = info.memory.textures
    this.statistics.programs = info.programs?.length || 0
    this.statistics.geometries = info.memory.geometries
    
    // Calculate memory usage
    this.statistics.memoryUsage.geometries = info.memory.geometries * 0.001 // Approximate KB
    this.statistics.memoryUsage.textures = info.memory.textures * 0.001 // Approximate KB
    this.statistics.memoryUsage.total = 
      this.statistics.memoryUsage.geometries + this.statistics.memoryUsage.textures
  }

  public getStatistics(): RenderingStatistics {
    return { ...this.statistics }
  }

  public setConfig(config: Partial<RenderingConfig>): void {
    this.config = { ...this.config, ...config }
  }

  public dispose(): void {
    // Clean up batched meshes
    this.batchGroups.forEach((group) => {
      if (group.batchedMesh) {
        group.batchedMesh.geometry.dispose()
        if (this.scene) {
          this.scene.remove(group.batchedMesh)
        }
      }
    })
    this.batchGroups.clear()

    // Clean up instanced meshes
    this.instanceGroups.forEach((group) => {
      group.mesh.dispose()
      if (this.scene) {
        this.scene.remove(group.mesh)
      }
    })
    this.instanceGroups.clear()

    // Dispose sub-optimizers
    this.occlusionCuller.dispose()
    this.shadowOptimizer.dispose()
  }
}

// Occlusion Culling implementation
class OcclusionCuller {
  private renderer?: THREE.WebGLRenderer
  private scene?: THREE.Scene
  private camera?: THREE.Camera
  private depthTexture?: THREE.DepthTexture
  private depthMaterial: THREE.MeshDepthMaterial

  constructor() {
    this.depthMaterial = new THREE.MeshDepthMaterial()
  }

  public initialize(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ): void {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera

    // Create depth texture for occlusion testing
    const size = renderer.getSize(new THREE.Vector2())
    this.depthTexture = new THREE.DepthTexture(size.x, size.y)
  }

  public cull(scene: THREE.Scene, camera: THREE.Camera): Set<THREE.Object3D> {
    const visibleObjects = new Set<THREE.Object3D>()

    // Simple depth-based occlusion culling
    // In a real implementation, this would use hierarchical Z-buffer or GPU queries
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // For now, just mark all visible meshes
        // Real occlusion culling would test against depth buffer
        visibleObjects.add(object)
      }
    })

    return visibleObjects
  }

  public dispose(): void {
    if (this.depthTexture) {
      this.depthTexture.dispose()
    }
    this.depthMaterial.dispose()
  }
}

// Shadow optimization
class ShadowOptimizer {
  private renderer?: THREE.WebGLRenderer
  private scene?: THREE.Scene
  private shadowCasters: Set<THREE.Object3D>
  private shadowReceivers: Set<THREE.Object3D>
  private dynamicShadows: Map<THREE.Light, boolean>

  constructor() {
    this.shadowCasters = new Set()
    this.shadowReceivers = new Set()
    this.dynamicShadows = new Map()
  }

  public initialize(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    this.renderer = renderer
    this.scene = scene

    // Identify shadow casters and receivers
    this.updateShadowObjects()
  }

  private updateShadowObjects(): void {
    if (!this.scene) return

    this.shadowCasters.clear()
    this.shadowReceivers.clear()

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.castShadow) {
          this.shadowCasters.add(object)
        }
        if (object.receiveShadow) {
          this.shadowReceivers.add(object)
        }
      }
    })
  }

  public optimize(): void {
    if (!this.scene || !this.renderer) return

    // Optimize shadow map resolution based on distance
    this.scene.traverse((object) => {
      if (object instanceof THREE.DirectionalLight ||
          object instanceof THREE.SpotLight ||
          object instanceof THREE.PointLight) {
        
        if (object.shadow) {
          // Adjust shadow map size based on performance
          const baseSize = 1024
          const qualityMultiplier = this.getQualityMultiplier()
          object.shadow.mapSize.setScalar(baseSize * qualityMultiplier)

          // Update shadow camera bounds for directional lights
          if (object instanceof THREE.DirectionalLight) {
            this.optimizeDirectionalLightShadow(object)
          }
        }
      }
    })
  }

  private getQualityMultiplier(): number {
    // This would be based on current performance metrics
    return 1.0
  }

  private optimizeDirectionalLightShadow(light: THREE.DirectionalLight): void {
    if (!light.shadow || !this.scene) return

    // Calculate optimal shadow camera bounds
    const box = new THREE.Box3()
    
    this.shadowCasters.forEach((object) => {
      if (object instanceof THREE.Mesh) {
        box.expandByObject(object)
      }
    })

    const camera = light.shadow.camera as THREE.OrthographicCamera
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    // Update shadow camera to tightly fit shadow casters
    camera.left = -size.x / 2
    camera.right = size.x / 2
    camera.top = size.y / 2
    camera.bottom = -size.y / 2
    camera.near = 0.1
    camera.far = size.z + 10
    camera.position.copy(center)
    camera.position.add(light.position.clone().normalize().multiplyScalar(size.z))
    camera.lookAt(center)
    camera.updateProjectionMatrix()
  }

  public dispose(): void {
    this.shadowCasters.clear()
    this.shadowReceivers.clear()
    this.dynamicShadows.clear()
  }
}