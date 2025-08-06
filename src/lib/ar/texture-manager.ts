'use client'

import * as THREE from 'three'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'

export type TextureType =
  | 'diffuse'
  | 'normal'
  | 'roughness'
  | 'metalness'
  | 'emissive'
  | 'ao'
  | 'displacement'
  | 'alpha'

export interface TextureConfig {
  url: string
  type: TextureType
  repeat?: [number, number]
  offset?: [number, number]
  rotation?: number
  wrapS?: THREE.Wrapping
  wrapT?: THREE.Wrapping
  flipY?: boolean
  encoding?: THREE.TextureEncoding
  format?: THREE.PixelFormat
  generateMipmaps?: boolean
  anisotropy?: number
}

export interface TextureSet {
  diffuse?: THREE.Texture
  normal?: THREE.Texture
  roughness?: THREE.Texture
  metalness?: THREE.Texture
  emissive?: THREE.Texture
  ao?: THREE.Texture
  displacement?: THREE.Texture
  alpha?: THREE.Texture
}

export class TextureManager {
  private textureLoader: THREE.TextureLoader
  private ktx2Loader: KTX2Loader | null = null
  private textureCache: Map<string, THREE.Texture> = new Map()
  private renderer: THREE.WebGLRenderer | null = null

  constructor(renderer?: THREE.WebGLRenderer) {
    this.textureLoader = new THREE.TextureLoader()
    this.renderer = renderer || null

    if (renderer) {
      this.setupKTX2Loader(renderer)
    }
  }

  private setupKTX2Loader(renderer: THREE.WebGLRenderer) {
    try {
      this.ktx2Loader = new KTX2Loader()
      this.ktx2Loader.setTranscoderPath(
        'https://cdn.jsdelivr.net/npm/three@0.179.0/examples/jsm/libs/basis/'
      )
      this.ktx2Loader.detectSupport(renderer)
    } catch (error) {
      console.warn('KTX2 loader setup failed:', error)
    }
  }

  async loadTexture(config: TextureConfig): Promise<THREE.Texture> {
    const cacheKey = `${config.url}_${config.type}`

    // キャッシュチェック
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!.clone()
    }

    const extension = config.url.split('.').pop()?.toLowerCase()
    let texture: THREE.Texture

    try {
      if (extension === 'ktx2' && this.ktx2Loader) {
        texture = await this.loadKTX2Texture(config.url)
      } else {
        texture = await this.loadStandardTexture(config.url)
      }

      // テクスチャ設定を適用
      this.applyTextureConfig(texture, config)

      // キャッシュに保存
      this.textureCache.set(cacheKey, texture)

      return texture
    } catch (error) {
      console.error(`Failed to load texture: ${config.url}`, error)
      throw error
    }
  }

  private loadStandardTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      )
    })
  }

  private loadKTX2Texture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      if (!this.ktx2Loader) {
        reject(new Error('KTX2 loader not initialized'))
        return
      }

      this.ktx2Loader.load(
        url,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      )
    })
  }

  private applyTextureConfig(texture: THREE.Texture, config: TextureConfig) {
    // リピート設定
    if (config.repeat) {
      texture.repeat.set(config.repeat[0], config.repeat[1])
      texture.wrapS = config.wrapS || THREE.RepeatWrapping
      texture.wrapT = config.wrapT || THREE.RepeatWrapping
    }

    // オフセット設定
    if (config.offset) {
      texture.offset.set(config.offset[0], config.offset[1])
    }

    // 回転設定
    if (config.rotation !== undefined) {
      texture.rotation = config.rotation
    }

    // Y軸反転
    if (config.flipY !== undefined) {
      texture.flipY = config.flipY
    }

    // エンコーディング設定
    if (config.encoding) {
      texture.encoding = config.encoding
    }

    // フォーマット設定
    if (config.format) {
      texture.format = config.format
    }

    // ミップマップ生成
    if (config.generateMipmaps !== undefined) {
      texture.generateMipmaps = config.generateMipmaps
    }

    // 異方性フィルタリング
    if (config.anisotropy !== undefined && this.renderer) {
      const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy()
      texture.anisotropy = Math.min(config.anisotropy, maxAnisotropy)
    }

    // タイプ別の特別な設定
    switch (config.type) {
      case 'normal':
        texture.encoding = THREE.LinearEncoding
        break
      case 'diffuse':
      case 'emissive':
        texture.encoding = config.encoding || THREE.sRGBEncoding
        break
      case 'roughness':
      case 'metalness':
      case 'ao':
        texture.encoding = THREE.LinearEncoding
        break
    }

    texture.needsUpdate = true
  }

  async loadTextureSet(configs: TextureConfig[]): Promise<TextureSet> {
    const textureSet: TextureSet = {}

    const loadPromises = configs.map(async (config) => {
      try {
        const texture = await this.loadTexture(config)
        textureSet[config.type] = texture
      } catch (error) {
        console.warn(`Failed to load ${config.type} texture:`, error)
      }
    })

    await Promise.all(loadPromises)
    return textureSet
  }

  // テクスチャの最適化
  optimizeTexture(texture: THREE.Texture, targetSize?: number): THREE.Texture {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      console.warn('Failed to create canvas context for texture optimization')
      return texture
    }

    // 元のテクスチャサイズを取得
    const image = texture.image as HTMLImageElement
    if (!image) return texture

    // ターゲットサイズを計算
    const maxSize = targetSize || 2048
    let width = image.width
    let height = image.height

    if (width > maxSize || height > maxSize) {
      const scale = Math.min(maxSize / width, maxSize / height)
      width = Math.floor(width * scale)
      height = Math.floor(height * scale)
    }

    // 2のべき乗に調整
    width = Math.pow(2, Math.floor(Math.log2(width)))
    height = Math.pow(2, Math.floor(Math.log2(height)))

    canvas.width = width
    canvas.height = height
    context.drawImage(image, 0, 0, width, height)

    const optimizedTexture = new THREE.CanvasTexture(canvas)
    optimizedTexture.wrapS = texture.wrapS
    optimizedTexture.wrapT = texture.wrapT
    optimizedTexture.repeat.copy(texture.repeat)
    optimizedTexture.offset.copy(texture.offset)
    optimizedTexture.rotation = texture.rotation
    optimizedTexture.encoding = texture.encoding

    return optimizedTexture
  }

  // テクスチャプレビュー生成
  generateTexturePreview(texture: THREE.Texture, size = 256): string {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true })
    renderer.setSize(size, size)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.MeshBasicMaterial({ map: texture })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    renderer.render(scene, camera)
    const dataURL = canvas.toDataURL('image/png')

    renderer.dispose()
    geometry.dispose()
    material.dispose()

    return dataURL
  }

  // メモリクリーンアップ
  disposeTexture(texture: THREE.Texture) {
    texture.dispose()

    // キャッシュから削除
    for (const [key, cachedTexture] of this.textureCache.entries()) {
      if (cachedTexture === texture) {
        this.textureCache.delete(key)
        break
      }
    }
  }

  clearCache() {
    for (const texture of this.textureCache.values()) {
      texture.dispose()
    }
    this.textureCache.clear()
  }

  dispose() {
    this.clearCache()
    if (this.ktx2Loader) {
      this.ktx2Loader.dispose()
    }
  }

  getCacheSize(): number {
    return this.textureCache.size
  }
}

// テクスチャ圧縮ユーティリティ
export class TextureCompressor {
  static async compressImage(file: File, maxSize = 2048, quality = 0.85): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const img = new Image()

        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            reject(new Error('Failed to create canvas context'))
            return
          }

          // サイズ計算
          let width = img.width
          let height = img.height

          if (width > maxSize || height > maxSize) {
            const scale = Math.min(maxSize / width, maxSize / height)
            width = Math.floor(width * scale)
            height = Math.floor(height * scale)
          }

          // 2のべき乗に調整
          width = Math.pow(2, Math.floor(Math.log2(width)))
          height = Math.pow(2, Math.floor(Math.log2(height)))

          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Failed to compress image'))
              }
            },
            'image/webp',
            quality
          )
        }

        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = e.target?.result as string
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }
}
