'use client'

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { AnimationManager } from '@/lib/ar/AnimationManager'
import { ModelCompressor, CompressionOptions, CompressionResult } from '@/lib/ar/ModelCompressor'
import { LODManager, LODConfiguration } from '@/lib/ar/LODManager'
import {
  TextureOptimizer,
  TextureOptimizationOptions,
  TextureStats,
} from '@/lib/ar/TextureOptimizer'

export interface ModelConfig {
  url: string
  scale?: number
  position?: [number, number, number]
  rotation?: [number, number, number]
  animation?: boolean
  mtlUrl?: string // For OBJ files with materials
  useDraco?: boolean // Enable DRACO compression for GLTF
  useKTX2?: boolean // Enable KTX2 texture compression
  onProgress?: (progress: number) => void
  castShadow?: boolean
  receiveShadow?: boolean
  // Compression options
  compress?: boolean
  compressionOptions?: CompressionOptions
  // LOD options
  useLOD?: boolean
  lodConfig?: Partial<LODConfiguration>
  // Texture optimization options
  optimizeTextures?: boolean
  textureOptions?: TextureOptimizationOptions
}

export interface ModelLoadResult {
  model: THREE.Group
  animationManager?: AnimationManager
  compressionResult?: CompressionResult
  lod?: THREE.LOD
  textureStats?: TextureStats[]
}

export class ModelLoader {
  private gltfLoader: GLTFLoader
  private fbxLoader: FBXLoader
  private objLoader: OBJLoader
  private mtlLoader: MTLLoader
  private dracoLoader: DRACOLoader | null = null
  private ktx2Loader: KTX2Loader | null = null
  private mixer: THREE.AnimationMixer | null = null
  private modelCache: Map<string, THREE.Group> = new Map()
  private renderer: THREE.WebGLRenderer | null = null
  private modelCompressor: ModelCompressor
  private lodManager: LODManager
  private textureOptimizer: TextureOptimizer

  constructor(renderer?: THREE.WebGLRenderer, camera?: THREE.Camera, scene?: THREE.Scene) {
    this.gltfLoader = new GLTFLoader()
    this.fbxLoader = new FBXLoader()
    this.objLoader = new OBJLoader()
    this.mtlLoader = new MTLLoader()
    this.renderer = renderer || null
    this.modelCompressor = new ModelCompressor()
    this.lodManager = new LODManager(camera, scene)
    this.textureOptimizer = new TextureOptimizer()

    // Setup DRACO loader for compressed GLTF models
    this.setupDracoLoader()

    // Setup KTX2 loader for compressed textures
    if (renderer) {
      this.setupKTX2Loader(renderer)
    }
  }

  private setupDracoLoader() {
    try {
      this.dracoLoader = new DRACOLoader()
      this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
      this.dracoLoader.setDecoderConfig({ type: 'js' })
      this.gltfLoader.setDRACOLoader(this.dracoLoader)
    } catch (error) {
      console.warn('DRACO loader setup failed:', error)
    }
  }

  private setupKTX2Loader(renderer: THREE.WebGLRenderer) {
    try {
      this.ktx2Loader = new KTX2Loader()
      this.ktx2Loader.setTranscoderPath(
        'https://cdn.jsdelivr.net/npm/three@0.179.0/examples/jsm/libs/basis/'
      )
      this.ktx2Loader.detectSupport(renderer)
      this.gltfLoader.setKTX2Loader(this.ktx2Loader)
    } catch (error) {
      console.warn('KTX2 loader setup failed:', error)
    }
  }

  async loadModel(config: ModelConfig): Promise<THREE.Group | THREE.LOD> {
    // Check cache first
    const cacheKey = `${config.url}_${JSON.stringify(config)}`
    if (this.modelCache.has(cacheKey) && !config.useLOD) {
      const cachedModel = this.modelCache.get(cacheKey)!.clone()
      return cachedModel
    }

    const extension = config.url.split('.').pop()?.toLowerCase()

    let model: THREE.Group

    try {
      switch (extension) {
        case 'gltf':
        case 'glb':
          model = await this.loadGLTF(config)
          break
        case 'fbx':
          model = await this.loadFBX(config)
          break
        case 'obj':
          model = await this.loadOBJ(config)
          break
        default:
          throw new Error(`Unsupported model format: ${extension}`)
      }

      // Apply transformations
      if (config.scale) {
        model.scale.set(config.scale, config.scale, config.scale)
      }

      if (config.position) {
        model.position.set(...config.position)
      }

      if (config.rotation) {
        model.rotation.set(...config.rotation)
      }

      // Apply shadow settings
      if (config.castShadow !== undefined || config.receiveShadow !== undefined) {
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (config.castShadow !== undefined) child.castShadow = config.castShadow
            if (config.receiveShadow !== undefined) child.receiveShadow = config.receiveShadow
          }
        })
      }

      // Apply compression if requested
      if (config.compress) {
        const compressionResult = await this.modelCompressor.compressModel(
          model,
          config.compressionOptions
        )
        model = compressionResult.model as THREE.Group
        console.log('Compression result:', compressionResult)
      }

      // Optimize textures if requested
      if (config.optimizeTextures) {
        await this.optimizeModelTextures(model, config.textureOptions)
      }

      // Create LOD if requested
      if (config.useLOD) {
        const lodId = `lod_${Date.now()}`
        const lod = await this.lodManager.createLOD(lodId, model, config.lodConfig)
        return lod
      }

      // Cache the model
      this.modelCache.set(cacheKey, model.clone())

      return model
    } catch (error) {
      console.error('Failed to load model:', error)
      throw error
    }
  }

  private loadGLTF(config: ModelConfig): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      // Configure loaders based on config
      if (config.useDraco && this.dracoLoader) {
        this.gltfLoader.setDRACOLoader(this.dracoLoader)
      }

      if (config.useKTX2 && this.ktx2Loader && this.renderer) {
        this.gltfLoader.setKTX2Loader(this.ktx2Loader)
      }

      this.gltfLoader.load(
        config.url,
        (gltf) => {
          const model = gltf.scene

          // Optimize materials
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Enable better rendering
              child.frustumCulled = true

              // Optimize materials
              if (child.material) {
                const material = child.material as THREE.MeshStandardMaterial
                if (material.map) material.map.anisotropy = 16
              }
            }
          })

          // Setup animations if available
          if (config.animation && gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(model)
            gltf.animations.forEach((clip) => {
              this.mixer?.clipAction(clip).play()
            })
          }

          resolve(model)
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100
          console.log('Loading progress:', percent.toFixed(2) + '%')
          config.onProgress?.(percent)
        },
        (error) => {
          console.error('GLTF loading error:', error)
          reject(error)
        }
      )
    })
  }

  private loadFBX(config: ModelConfig): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.fbxLoader.load(
        config.url,
        (fbx) => {
          // Optimize FBX model
          fbx.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.frustumCulled = true

              // Fix material issues common with FBX files
              if (child.material) {
                const material = child.material as THREE.MeshPhongMaterial
                material.shininess = 100
              }
            }
          })

          // Setup animations if available
          if (config.animation && fbx.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(fbx)
            fbx.animations.forEach((clip) => {
              this.mixer?.clipAction(clip).play()
            })
          }

          resolve(fbx)
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100
          console.log('Loading progress:', percent.toFixed(2) + '%')
          config.onProgress?.(percent)
        },
        (error) => {
          console.error('FBX loading error:', error)
          reject(error)
        }
      )
    })
  }

  private async loadOBJ(config: ModelConfig): Promise<THREE.Group> {
    return new Promise(async (resolve, reject) => {
      try {
        // Load MTL file first if provided
        if (config.mtlUrl) {
          const materials = await this.loadMTL(config.mtlUrl)
          this.objLoader.setMaterials(materials)
        }

        this.objLoader.load(
          config.url,
          (obj) => {
            // Apply default material if no MTL was loaded
            if (!config.mtlUrl) {
              obj.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.material = new THREE.MeshPhongMaterial({
                    color: 0x808080,
                    specular: 0x111111,
                    shininess: 200,
                  })
                }
              })
            }

            resolve(obj)
          },
          (progress) => {
            const percent = (progress.loaded / progress.total) * 100
            console.log('Loading progress:', percent.toFixed(2) + '%')
            config.onProgress?.(percent)
          },
          (error) => {
            console.error('OBJ loading error:', error)
            reject(error)
          }
        )
      } catch (error) {
        reject(error)
      }
    })
  }

  private loadMTL(url: string): Promise<MTLLoader.MaterialCreator> {
    return new Promise((resolve, reject) => {
      this.mtlLoader.load(
        url,
        (materials) => {
          materials.preload()
          resolve(materials)
        },
        (progress) => {
          console.log('MTL Loading:', (progress.loaded / progress.total) * 100 + '%')
        },
        (error) => {
          console.error('MTL loading error:', error)
          reject(error)
        }
      )
    })
  }

  updateAnimation(delta: number) {
    if (this.mixer) {
      this.mixer.update(delta)
    }
  }

  dispose() {
    this.mixer = null
    this.modelCache.clear()

    if (this.dracoLoader) {
      this.dracoLoader.dispose()
    }

    if (this.ktx2Loader) {
      this.ktx2Loader.dispose()
    }

    this.modelCompressor.dispose()
    this.lodManager.dispose()
    this.textureOptimizer.dispose()
  }

  clearCache() {
    this.modelCache.clear()
  }

  getCacheSize(): number {
    return this.modelCache.size
  }

  async loadModelWithAnimations(config: ModelConfig): Promise<ModelLoadResult> {
    const modelOrLod = await this.loadModel(config)

    // Determine if we have a LOD or regular model
    const isLOD = modelOrLod instanceof THREE.LOD
    const model = isLOD
      ? ((modelOrLod as THREE.LOD).levels[0].object as THREE.Group)
      : (modelOrLod as THREE.Group)

    // Create animation manager if the model has animations
    const extension = config.url.split('.').pop()?.toLowerCase()
    let animationManager: AnimationManager | undefined
    let compressionResult: CompressionResult | undefined
    let textureStats: TextureStats[] | undefined

    if (extension === 'gltf' || extension === 'glb' || extension === 'fbx') {
      animationManager = new AnimationManager(model)

      // Load animations based on format
      if (extension === 'gltf' || extension === 'glb') {
        // For GLTF, we need to reload to get animations
        const gltf = await new Promise<any>((resolve, reject) => {
          this.gltfLoader.load(
            config.url,
            (gltf) => resolve(gltf),
            undefined,
            (error) => reject(error)
          )
        })

        if (gltf.animations && gltf.animations.length > 0) {
          animationManager.loadAnimations(gltf)
        }
      } else if (extension === 'fbx') {
        // For FBX, animations are part of the model
        const fbx = await new Promise<any>((resolve, reject) => {
          this.fbxLoader.load(
            config.url,
            (fbx) => resolve(fbx),
            undefined,
            (error) => reject(error)
          )
        })

        if (fbx.animations && fbx.animations.length > 0) {
          // Convert FBX animations to GLTF-like format
          const gltfLike = {
            animations: fbx.animations,
          }
          animationManager.loadAnimations(gltfLike)
        }
      }
    }

    // Get compression result if compression was applied
    if (config.compress) {
      compressionResult = await this.modelCompressor.compressModel(model, config.compressionOptions)
    }

    // Optimize textures if requested
    if (config.optimizeTextures) {
      textureStats = await this.optimizeModelTextures(model, config.textureOptions)
    }

    return {
      model: isLOD ? model : (modelOrLod as THREE.Group),
      animationManager,
      compressionResult,
      lod: isLOD ? (modelOrLod as THREE.LOD) : undefined,
      textureStats,
    }
  }

  // New methods for compression and LOD management
  async compressModel(
    model: THREE.Object3D,
    options?: CompressionOptions
  ): Promise<CompressionResult> {
    return await this.modelCompressor.compressModel(model, options)
  }

  async createLOD(
    id: string,
    model: THREE.Object3D,
    config?: Partial<LODConfiguration>
  ): Promise<THREE.LOD> {
    return await this.lodManager.createLOD(id, model, config)
  }

  updateLODs(): void {
    this.lodManager.updateLODs()
  }

  getLODStatistics() {
    return this.lodManager.getStatistics()
  }

  setCamera(camera: THREE.Camera): void {
    this.lodManager.setCamera(camera)
  }

  setScene(scene: THREE.Scene): void {
    this.lodManager.setScene(scene)
  }

  // Texture optimization methods
  async optimizeModelTextures(
    model: THREE.Object3D,
    options?: TextureOptimizationOptions
  ): Promise<TextureStats[]> {
    const textures: THREE.Texture[] = []
    const stats: TextureStats[] = []

    // Collect all textures from the model
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as any

        if (material) {
          // Check for standard material properties
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
              textures.push(material[prop])
            }
          })

          // Handle array materials
          if (Array.isArray(material)) {
            material.forEach((mat: any) => {
              textureProperties.forEach((prop) => {
                if (mat[prop] && mat[prop] instanceof THREE.Texture) {
                  textures.push(mat[prop])
                }
              })
            })
          }
        }
      }
    })

    // Optimize each texture
    for (const texture of textures) {
      try {
        const result = await this.textureOptimizer.optimizeTexture(texture, options)

        // Replace original texture with optimized one
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
                if (material[prop] === texture) {
                  material[prop] = result.texture
                  material.needsUpdate = true
                }
              })
            }
          }
        })

        stats.push(result.stats)
      } catch (error) {
        console.error('Failed to optimize texture:', error)
      }
    }

    console.log(`Optimized ${stats.length} textures`)
    if (stats.length > 0) {
      const totalOriginal = stats.reduce((sum, s) => sum + s.originalSize, 0)
      const totalOptimized = stats.reduce((sum, s) => sum + s.optimizedSize, 0)
      const avgCompression = stats.reduce((sum, s) => sum + s.compressionRatio, 0) / stats.length

      console.log(
        `Total size reduction: ${((totalOriginal - totalOptimized) / 1024 / 1024).toFixed(2)} MB`
      )
      console.log(`Average compression ratio: ${avgCompression.toFixed(1)}%`)
    }

    return stats
  }

  getTextureOptimizer(): TextureOptimizer {
    return this.textureOptimizer
  }
}

// Helper function to create basic 3D shapes
export const createBasicShapes = {
  cube: (size = 0.2, color = 0x00ff00) => {
    const geometry = new THREE.BoxGeometry(size, size, size)
    const material = new THREE.MeshPhongMaterial({ color })
    return new THREE.Mesh(geometry, material)
  },

  sphere: (radius = 0.1, color = 0xff0000) => {
    const geometry = new THREE.SphereGeometry(radius, 32, 32)
    const material = new THREE.MeshPhongMaterial({ color })
    return new THREE.Mesh(geometry, material)
  },

  cylinder: (radiusTop = 0.05, radiusBottom = 0.05, height = 0.2, color = 0x0000ff) => {
    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32)
    const material = new THREE.MeshPhongMaterial({ color })
    return new THREE.Mesh(geometry, material)
  },

  torus: (radius = 0.1, tube = 0.03, color = 0xffff00) => {
    const geometry = new THREE.TorusGeometry(radius, tube, 16, 100)
    const material = new THREE.MeshPhongMaterial({ color })
    return new THREE.Mesh(geometry, material)
  },
}
