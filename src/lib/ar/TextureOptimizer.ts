import * as THREE from 'three'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader'

export interface TextureOptimizationOptions {
  maxSize?: number
  quality?: number // 0-100
  format?: 'webp' | 'jpeg' | 'png' | 'basis' | 'ktx2'
  generateMipmaps?: boolean
  powerOfTwo?: boolean
  removeAlpha?: boolean
  compress?: boolean
}

export interface TextureStats {
  originalSize: number
  optimizedSize: number
  compressionRatio: number
  width: number
  height: number
  format: string
  hasAlpha: boolean
}

export class TextureOptimizer {
  private ktx2Loader: KTX2Loader | null = null
  private textureCache: Map<string, THREE.Texture> = new Map()
  private statsCache: Map<string, TextureStats> = new Map()
  private renderer: THREE.WebGLRenderer | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeLoaders()
    }
  }

  private initializeLoaders(): void {
    // Initialize renderer for KTX2
    this.renderer = new THREE.WebGLRenderer({ alpha: true })

    // Initialize KTX2 loader
    this.ktx2Loader = new KTX2Loader()
    this.ktx2Loader.setTranscoderPath('/basis/')
    this.ktx2Loader.detectSupport(this.renderer)
  }

  async optimizeTexture(
    texture: THREE.Texture | string,
    options: TextureOptimizationOptions = {}
  ): Promise<{ texture: THREE.Texture; stats: TextureStats }> {
    const {
      maxSize = 2048,
      quality = 85,
      format = 'webp',
      generateMipmaps = true,
      powerOfTwo = true,
      removeAlpha = false,
      compress = true,
    } = options

    let sourceTexture: THREE.Texture

    if (typeof texture === 'string') {
      sourceTexture = await this.loadTexture(texture)
    } else {
      sourceTexture = texture
    }

    // Clone texture to avoid modifying original
    const optimizedTexture = sourceTexture.clone()

    // Calculate original size
    const originalSize = this.calculateTextureSize(sourceTexture)

    // Resize if needed
    if (sourceTexture.image) {
      const resizedImage = await this.resizeImage(sourceTexture.image, maxSize, powerOfTwo)
      optimizedTexture.image = resizedImage
    }

    // Apply compression based on format
    if (compress) {
      await this.compressTexture(optimizedTexture, format, quality)
    }

    // Generate mipmaps if requested
    if (generateMipmaps) {
      optimizedTexture.generateMipmaps = true
      optimizedTexture.minFilter = THREE.LinearMipmapLinearFilter
    }

    // Remove alpha channel if requested
    if (removeAlpha && optimizedTexture.format === THREE.RGBAFormat) {
      optimizedTexture.format = THREE.RGBFormat
    }

    // Update texture
    optimizedTexture.needsUpdate = true

    // Calculate stats
    const stats: TextureStats = {
      originalSize,
      optimizedSize: this.calculateTextureSize(optimizedTexture),
      compressionRatio: 0,
      width: optimizedTexture.image?.width || 0,
      height: optimizedTexture.image?.height || 0,
      format,
      hasAlpha: optimizedTexture.format === THREE.RGBAFormat,
    }

    stats.compressionRatio = ((originalSize - stats.optimizedSize) / originalSize) * 100

    // Cache the optimized texture
    const cacheKey = this.generateCacheKey(texture, options)
    this.textureCache.set(cacheKey, optimizedTexture)
    this.statsCache.set(cacheKey, stats)

    return { texture: optimizedTexture, stats }
  }

  private async loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader()
      loader.load(
        url,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      )
    })
  }

  private async resizeImage(
    image: any,
    maxSize: number,
    powerOfTwo: boolean
  ): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    let width = image.width
    let height = image.height

    // Scale down if larger than maxSize
    if (width > maxSize || height > maxSize) {
      const scale = Math.min(maxSize / width, maxSize / height)
      width = Math.floor(width * scale)
      height = Math.floor(height * scale)
    }

    // Convert to power of two if requested
    if (powerOfTwo) {
      width = this.nearestPowerOfTwo(width)
      height = this.nearestPowerOfTwo(height)
    }

    canvas.width = width
    canvas.height = height

    // Draw resized image
    ctx.drawImage(image, 0, 0, width, height)

    return canvas
  }

  private nearestPowerOfTwo(value: number): number {
    return Math.pow(2, Math.round(Math.log(value) / Math.log(2)))
  }

  private async compressTexture(
    texture: THREE.Texture,
    format: string,
    quality: number
  ): Promise<void> {
    if (!texture.image) return

    const canvas = texture.image as HTMLCanvasElement
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Convert to specified format
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), `image/${format}`, quality / 100)
    })

    // Create new image from compressed blob
    const img = new Image()
    const url = URL.createObjectURL(blob)

    return new Promise((resolve) => {
      img.onload = () => {
        texture.image = img
        URL.revokeObjectURL(url)
        resolve()
      }
      img.src = url
    })
  }

  private calculateTextureSize(texture: THREE.Texture): number {
    if (!texture.image) return 0

    const width = texture.image.width || 0
    const height = texture.image.height || 0
    const channels = texture.format === THREE.RGBAFormat ? 4 : 3

    // Basic calculation (uncompressed size)
    let size = width * height * channels

    // Add mipmap sizes if enabled
    if (texture.generateMipmaps) {
      let mipWidth = width
      let mipHeight = height

      while (mipWidth > 1 || mipHeight > 1) {
        mipWidth = Math.max(1, Math.floor(mipWidth / 2))
        mipHeight = Math.max(1, Math.floor(mipHeight / 2))
        size += mipWidth * mipHeight * channels
      }
    }

    return size
  }

  private generateCacheKey(
    texture: THREE.Texture | string,
    options: TextureOptimizationOptions
  ): string {
    const textureId = typeof texture === 'string' ? texture : texture.uuid
    return `${textureId}_${JSON.stringify(options)}`
  }

  async optimizeBatch(
    textures: (THREE.Texture | string)[],
    options: TextureOptimizationOptions = {}
  ): Promise<Array<{ texture: THREE.Texture; stats: TextureStats }>> {
    const results = await Promise.all(
      textures.map((texture) => this.optimizeTexture(texture, options))
    )

    return results
  }

  getCachedTexture(
    texture: THREE.Texture | string,
    options: TextureOptimizationOptions
  ): THREE.Texture | null {
    const key = this.generateCacheKey(texture, options)
    return this.textureCache.get(key) || null
  }

  getCachedStats(
    texture: THREE.Texture | string,
    options: TextureOptimizationOptions
  ): TextureStats | null {
    const key = this.generateCacheKey(texture, options)
    return this.statsCache.get(key) || null
  }

  clearCache(): void {
    // Dispose textures before clearing
    this.textureCache.forEach((texture) => {
      texture.dispose()
    })

    this.textureCache.clear()
    this.statsCache.clear()
  }

  getTotalCacheSize(): number {
    let totalSize = 0
    this.statsCache.forEach((stats) => {
      totalSize += stats.optimizedSize
    })
    return totalSize
  }

  getCacheInfo(): {
    textureCount: number
    totalSize: number
    averageCompressionRatio: number
  } {
    const textureCount = this.textureCache.size
    const totalSize = this.getTotalCacheSize()

    let totalCompressionRatio = 0
    this.statsCache.forEach((stats) => {
      totalCompressionRatio += stats.compressionRatio
    })

    const averageCompressionRatio = textureCount > 0 ? totalCompressionRatio / textureCount : 0

    return {
      textureCount,
      totalSize,
      averageCompressionRatio,
    }
  }

  dispose(): void {
    this.clearCache()

    if (this.renderer) {
      this.renderer.dispose()
      this.renderer = null
    }

    this.ktx2Loader = null
  }
}

// テクスチャアトラス生成器
export class TextureAtlasGenerator {
  private maxAtlasSize: number

  constructor(maxAtlasSize: number = 4096) {
    this.maxAtlasSize = maxAtlasSize
  }

  async generateAtlas(
    textures: THREE.Texture[],
    padding: number = 2
  ): Promise<{
    atlas: THREE.Texture
    uvMappings: Map<string, { u: number; v: number; w: number; h: number }>
  }> {
    // Sort textures by size (largest first)
    const sortedTextures = [...textures].sort((a, b) => {
      const aSize = (a.image?.width || 0) * (a.image?.height || 0)
      const bSize = (b.image?.width || 0) * (b.image?.height || 0)
      return bSize - aSize
    })

    // Create atlas canvas
    const canvas = document.createElement('canvas')
    canvas.width = this.maxAtlasSize
    canvas.height = this.maxAtlasSize
    const ctx = canvas.getContext('2d')!

    const uvMappings = new Map<string, { u: number; v: number; w: number; h: number }>()

    // Simple packing algorithm
    let currentX = 0
    let currentY = 0
    let rowHeight = 0

    for (const texture of sortedTextures) {
      if (!texture.image) continue

      const width = texture.image.width || 0
      const height = texture.image.height || 0

      // Check if texture fits in current row
      if (currentX + width + padding > this.maxAtlasSize) {
        currentX = 0
        currentY += rowHeight + padding
        rowHeight = 0
      }

      // Check if texture fits in atlas
      if (currentY + height + padding > this.maxAtlasSize) {
        console.warn('Texture atlas is full, some textures may not fit')
        break
      }

      // Draw texture to atlas
      ctx.drawImage(texture.image as any, currentX, currentY, width, height)

      // Store UV mapping
      uvMappings.set(texture.uuid, {
        u: currentX / this.maxAtlasSize,
        v: currentY / this.maxAtlasSize,
        w: width / this.maxAtlasSize,
        h: height / this.maxAtlasSize,
      })

      // Update position
      currentX += width + padding
      rowHeight = Math.max(rowHeight, height)
    }

    // Create atlas texture
    const atlasTexture = new THREE.CanvasTexture(canvas)
    atlasTexture.generateMipmaps = true
    atlasTexture.minFilter = THREE.LinearMipmapLinearFilter
    atlasTexture.needsUpdate = true

    return { atlas: atlasTexture, uvMappings }
  }
}

// メモリ管理付きテクスチャキャッシュ
export class TextureCache {
  private cache: Map<string, { texture: THREE.Texture; lastAccess: number; size: number }> =
    new Map()
  private maxCacheSize: number
  private currentSize: number = 0

  constructor(maxCacheSizeMB: number = 100) {
    this.maxCacheSize = maxCacheSizeMB * 1024 * 1024 // Convert to bytes
  }

  set(key: string, texture: THREE.Texture, size: number): void {
    // Remove old entry if exists
    if (this.cache.has(key)) {
      const old = this.cache.get(key)!
      this.currentSize -= old.size
      old.texture.dispose()
    }

    // Check if we need to free space
    while (this.currentSize + size > this.maxCacheSize && this.cache.size > 0) {
      this.evictLRU()
    }

    // Add new entry
    this.cache.set(key, {
      texture,
      lastAccess: Date.now(),
      size,
    })
    this.currentSize += size
  }

  get(key: string): THREE.Texture | null {
    const entry = this.cache.get(key)
    if (entry) {
      entry.lastAccess = Date.now()
      return entry.texture
    }
    return null
  }

  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess
        oldestKey = key
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!
      this.currentSize -= entry.size
      entry.texture.dispose()
      this.cache.delete(oldestKey)
    }
  }

  clear(): void {
    for (const entry of this.cache.values()) {
      entry.texture.dispose()
    }
    this.cache.clear()
    this.currentSize = 0
  }

  getInfo(): { count: number; size: number; maxSize: number } {
    return {
      count: this.cache.size,
      size: this.currentSize,
      maxSize: this.maxCacheSize,
    }
  }
}
