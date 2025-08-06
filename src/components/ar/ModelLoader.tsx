'use client'

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

export interface ModelConfig {
  url: string
  scale?: number
  position?: [number, number, number]
  rotation?: [number, number, number]
  animation?: boolean
}

export class ModelLoader {
  private gltfLoader: GLTFLoader
  private fbxLoader: FBXLoader
  private objLoader: OBJLoader
  private mixer: THREE.AnimationMixer | null = null

  constructor() {
    this.gltfLoader = new GLTFLoader()
    this.fbxLoader = new FBXLoader()
    this.objLoader = new OBJLoader()
  }

  async loadModel(config: ModelConfig): Promise<THREE.Group> {
    const extension = config.url.split('.').pop()?.toLowerCase()

    let model: THREE.Group

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

    return model
  }

  private loadGLTF(config: ModelConfig): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        config.url,
        (gltf) => {
          const model = gltf.scene

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
          console.log('Loading progress:', (progress.loaded / progress.total) * 100 + '%')
        },
        (error) => {
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
          console.log('Loading progress:', (progress.loaded / progress.total) * 100 + '%')
        },
        (error) => {
          reject(error)
        }
      )
    })
  }

  private loadOBJ(config: ModelConfig): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.objLoader.load(
        config.url,
        (obj) => {
          resolve(obj)
        },
        (progress) => {
          console.log('Loading progress:', (progress.loaded / progress.total) * 100 + '%')
        },
        (error) => {
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
