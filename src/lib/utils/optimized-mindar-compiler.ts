// 最適化されたMindARコンパイラー
// 高度な特徴点検出とトラッキング品質評価を統合

import { detectFeatures, FeatureDetectionOptions } from './feature-detector'
import { TrackingEvaluator } from './tracking-evaluator'

export interface OptimizedCompileOptions {
  dpi?: number
  widthInMM?: number
  heightInMM?: number
  quality?: 'low' | 'medium' | 'high' | 'auto'
  algorithm?: 'fast' | 'harris' | 'orb' | 'hybrid'
  evaluateQuality?: boolean
  optimizeForPerformance?: boolean
}

export interface OptimizedCompileResult {
  success: boolean
  data?: Blob
  error?: string
  quality?: {
    overall: number
    featureScore: number
    uniquenessScore: number
    textureScore: number
    contrastScore: number
    stabilityScore: number
    recommendations: string[]
  }
  metadata?: {
    featureCount: number
    processingTime: number
    fileSize: number
    algorithm: string
  }
}

export class OptimizedMindARCompiler {
  private evaluator: TrackingEvaluator

  constructor() {
    this.evaluator = new TrackingEvaluator()
  }

  async compile(
    imageFile: File,
    options: OptimizedCompileOptions = {}
  ): Promise<OptimizedCompileResult> {
    const startTime = performance.now()

    try {
      // 画像を読み込んでImageDataを取得
      const imageData = await this.loadImageData(imageFile)

      // 品質設定を自動調整
      let quality = options.quality || 'medium'
      let algorithm = options.algorithm || 'hybrid'

      if (quality === 'auto') {
        quality = this.determineOptimalQuality(imageData)
      }

      // 特徴点検出オプションを設定
      const detectionOptions: FeatureDetectionOptions = {
        algorithm,
        quality,
        maxFeatures: this.getMaxFeatures(quality),
        threshold: this.getThreshold(quality),
        nonMaxSuppression: true,
      }

      // 高度な特徴点検出
      const features = detectFeatures(imageData, detectionOptions)

      // トラッキング品質評価
      let qualityReport = undefined
      if (options.evaluateQuality !== false) {
        qualityReport = this.evaluator.evaluate(imageData, features)

        // 品質が低い場合は警告
        if (qualityReport.overall < 50) {
          console.warn('Low tracking quality detected:', qualityReport.recommendations)
        }
      }

      // パフォーマンス最適化
      let optimizedFeatures = features
      if (options.optimizeForPerformance) {
        optimizedFeatures = this.optimizeFeatures(features, imageData.width, imageData.height)
      }

      // .mindファイルを生成
      const mindData = this.generateMindFile(imageData, optimizedFeatures, {
        dpi: options.dpi || 72,
        widthInMM: options.widthInMM,
        heightInMM: options.heightInMM,
      })

      const processingTime = performance.now() - startTime

      return {
        success: true,
        data: new Blob([mindData], { type: 'application/octet-stream' }),
        quality: qualityReport,
        metadata: {
          featureCount: optimizedFeatures.length,
          processingTime: Math.round(processingTime),
          fileSize: mindData.byteLength,
          algorithm,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Compilation failed',
      }
    }
  }

  private async loadImageData(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const img = new Image()

        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            reject(new Error('Canvas context not available'))
            return
          }

          ctx.drawImage(img, 0, 0)
          resolve(ctx.getImageData(0, 0, img.width, img.height))
        }

        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = e.target?.result as string
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  private determineOptimalQuality(imageData: ImageData): 'low' | 'medium' | 'high' {
    const pixels = imageData.width * imageData.height

    // 画像サイズに基づいて品質を決定
    if (pixels < 500000) return 'high' // < 0.5MP
    if (pixels < 2000000) return 'medium' // < 2MP
    return 'low' // >= 2MP
  }

  private getMaxFeatures(quality: 'low' | 'medium' | 'high'): number {
    switch (quality) {
      case 'high':
        return 1000
      case 'medium':
        return 500
      case 'low':
        return 250
      default:
        return 500
    }
  }

  private getThreshold(quality: 'low' | 'medium' | 'high'): number {
    switch (quality) {
      case 'high':
        return 10
      case 'medium':
        return 15
      case 'low':
        return 20
      default:
        return 15
    }
  }

  private optimizeFeatures(features: any[], width: number, height: number): any[] {
    // 特徴点をグリッドベースでフィルタリング
    const gridSize = 16
    const grid: Map<string, any> = new Map()

    for (const feature of features) {
      const gridX = Math.floor(feature.x * gridSize)
      const gridY = Math.floor(feature.y * gridSize)
      const key = `${gridX},${gridY}`

      const existing = grid.get(key)
      if (!existing || feature.strength > existing.strength) {
        grid.set(key, feature)
      }
    }

    // 強度でソートして上位を選択
    const optimized = Array.from(grid.values())
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 500)

    return optimized
  }

  private generateMindFile(
    imageData: ImageData,
    features: any[],
    options: {
      dpi: number
      widthInMM?: number
      heightInMM?: number
    }
  ): ArrayBuffer {
    const { width, height } = imageData
    const dpi = options.dpi
    const widthInMM = options.widthInMM || (width * 25.4) / dpi
    const heightInMM = options.heightInMM || (height * 25.4) / dpi

    // ヘッダー情報を拡張
    const header = {
      version: '2.0.0',
      targetCount: 1,
      imageWidth: width,
      imageHeight: height,
      physicalWidth: widthInMM,
      physicalHeight: heightInMM,
      dpi: dpi,
      timestamp: Date.now(),
      features: features.map((f) => ({
        x: f.x,
        y: f.y,
        scale: f.scale,
        orientation: f.orientation,
        strength: f.strength,
        descriptor: f.descriptor || [],
      })),
      metadata: {
        compiler: 'OptimizedMindARCompiler',
        featureDetector: 'hybrid',
        featureCount: features.length,
      },
    }

    // JSONをバイナリに変換（圧縮）
    const jsonString = JSON.stringify(header)
    const encoder = new TextEncoder()
    const uint8Array = encoder.encode(jsonString)

    // 簡易圧縮（実際の実装ではpako等を使用）
    const compressed = this.simpleCompress(uint8Array)

    // マジックナンバーとバージョン
    const magic = new Uint8Array([0x4d, 0x49, 0x4e, 0x44]) // 'MIND'
    const version = new Uint8Array([0x02, 0x00, 0x00, 0x00]) // Version 2.0.0.0

    // データサイズ
    const dataSize = new Uint32Array([compressed.length])
    const dataSizeBytes = new Uint8Array(dataSize.buffer)

    // 結合
    const totalLength = magic.length + version.length + dataSizeBytes.length + compressed.length
    const result = new Uint8Array(totalLength)

    let offset = 0
    result.set(magic, offset)
    offset += magic.length

    result.set(version, offset)
    offset += version.length

    result.set(dataSizeBytes, offset)
    offset += dataSizeBytes.length

    result.set(compressed, offset)

    return result.buffer
  }

  private simpleCompress(data: Uint8Array): Uint8Array {
    // 簡易RLE圧縮（実際の実装では適切な圧縮ライブラリを使用）
    const compressed: number[] = []
    let i = 0

    while (i < data.length) {
      let count = 1
      const value = data[i]

      while (i + count < data.length && data[i + count] === value && count < 255) {
        count++
      }

      if (count > 3) {
        // RLEエンコード: [0xFF, count, value]
        compressed.push(0xff, count, value)
        i += count
      } else {
        // そのままコピー
        compressed.push(value)
        i++
      }
    }

    return new Uint8Array(compressed)
  }
}

// シングルトンインスタンス
let compilerInstance: OptimizedMindARCompiler | null = null

export function getOptimizedMindARCompiler(): OptimizedMindARCompiler {
  if (!compilerInstance) {
    compilerInstance = new OptimizedMindARCompiler()
  }
  return compilerInstance
}

// Worker版の実装（非同期処理用）
export function createOptimizedCompilerWorker(): Worker {
  const workerCode = `
    importScripts('${location.origin}/optimized-mindar-compiler.js');
    
    self.addEventListener('message', async (event) => {
      const { type, imageData, options } = event.data;
      
      if (type === 'compile') {
        try {
          const compiler = new OptimizedMindARCompiler();
          const result = await compiler.compileFromImageData(imageData, options);
          
          self.postMessage({
            type: 'success',
            result
          });
        } catch (error) {
          self.postMessage({
            type: 'error',
            error: error.message || 'Compilation failed'
          });
        }
      }
    });
  `

  const blob = new Blob([workerCode], { type: 'application/javascript' })
  const workerUrl = URL.createObjectURL(blob)
  return new Worker(workerUrl)
}
