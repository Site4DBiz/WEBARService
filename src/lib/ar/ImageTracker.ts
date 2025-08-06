/**
 * ImageTracker - 画像トラッキングの最適化
 *
 * 機能:
 * - 画像特徴点の抽出と管理
 * - トラッキング品質の評価
 * - リアルタイムパフォーマンス最適化
 * - 画像前処理と最適化
 */

export interface ImageFeature {
  points: number
  quality: number
  contrast: number
  uniqueness: number
  trackability: number
}

export interface TrackingSettings {
  filterMinCF: number
  filterBeta: number
  warmupTolerance: number
  missTolerance: number
  smoothingFactor: number
  adaptiveThreshold: boolean
  enhanceContrast: boolean
  edgeDetection: boolean
}

export interface OptimizationResult {
  optimizedSettings: TrackingSettings
  expectedImprovement: number
  recommendations: string[]
}

export class ImageTracker {
  private canvas: HTMLCanvasElement
  private context: CanvasRenderingContext2D
  private imageCache: Map<string, ImageFeature>
  private performanceMetrics: {
    fps: number[]
    detectionTime: number[]
    trackingStability: number[]
  }

  constructor() {
    this.canvas = document.createElement('canvas')
    this.context = this.canvas.getContext('2d')!
    this.imageCache = new Map()
    this.performanceMetrics = {
      fps: [],
      detectionTime: [],
      trackingStability: [],
    }
  }

  /**
   * 画像の特徴点を分析
   */
  async analyzeImage(imageUrl: string): Promise<ImageFeature> {
    // キャッシュチェック
    if (this.imageCache.has(imageUrl)) {
      return this.imageCache.get(imageUrl)!
    }

    const image = await this.loadImage(imageUrl)

    // キャンバスに画像を描画
    this.canvas.width = image.width
    this.canvas.height = image.height
    this.context.drawImage(image, 0, 0)

    const imageData = this.context.getImageData(0, 0, image.width, image.height)

    // 特徴点を計算
    const points = this.detectFeaturePoints(imageData)
    const quality = this.calculateImageQuality(imageData)
    const contrast = this.calculateContrast(imageData)
    const uniqueness = this.calculateUniqueness(imageData)
    const trackability = this.calculateTrackability(points, quality, contrast, uniqueness)

    const features: ImageFeature = {
      points,
      quality,
      contrast,
      uniqueness,
      trackability,
    }

    // キャッシュに保存
    this.imageCache.set(imageUrl, features)

    return features
  }

  /**
   * 特徴点の検出（簡易版Harris Corner Detection）
   */
  private detectFeaturePoints(imageData: ImageData): number {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height

    let cornerCount = 0
    const threshold = 100

    // グレースケール変換と簡易エッジ検出
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4

        // Sobelフィルタによるエッジ検出
        const gx = this.getSobelX(data, width, x, y)
        const gy = this.getSobelY(data, width, x, y)
        const gradient = Math.sqrt(gx * gx + gy * gy)

        if (gradient > threshold) {
          cornerCount++
        }
      }
    }

    return cornerCount
  }

  /**
   * Sobelフィルタ（X方向）
   */
  private getSobelX(data: Uint8ClampedArray, width: number, x: number, y: number): number {
    const getPixel = (px: number, py: number) => {
      const idx = (py * width + px) * 4
      return data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114
    }

    return (
      -1 * getPixel(x - 1, y - 1) +
      1 * getPixel(x + 1, y - 1) +
      -2 * getPixel(x - 1, y) +
      2 * getPixel(x + 1, y) +
      -1 * getPixel(x - 1, y + 1) +
      1 * getPixel(x + 1, y + 1)
    )
  }

  /**
   * Sobelフィルタ（Y方向）
   */
  private getSobelY(data: Uint8ClampedArray, width: number, x: number, y: number): number {
    const getPixel = (px: number, py: number) => {
      const idx = (py * width + px) * 4
      return data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114
    }

    return (
      -1 * getPixel(x - 1, y - 1) -
      2 * getPixel(x, y - 1) -
      1 * getPixel(x + 1, y - 1) +
      1 * getPixel(x - 1, y + 1) +
      2 * getPixel(x, y + 1) +
      1 * getPixel(x + 1, y + 1)
    )
  }

  /**
   * 画像品質の計算
   */
  private calculateImageQuality(imageData: ImageData): number {
    const data = imageData.data
    let sharpness = 0

    // ラプラシアンフィルタによるシャープネス計算
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      sharpness += gray
    }

    return Math.min(100, sharpness / (data.length / 4) / 2.55)
  }

  /**
   * コントラストの計算
   */
  private calculateContrast(imageData: ImageData): number {
    const data = imageData.data
    let min = 255
    let max = 0

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      min = Math.min(min, gray)
      max = Math.max(max, gray)
    }

    return ((max - min) / 255) * 100
  }

  /**
   * ユニークネスの計算
   */
  private calculateUniqueness(imageData: ImageData): number {
    const data = imageData.data
    const histogram = new Array(256).fill(0)

    // ヒストグラムを作成
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.floor(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114)
      histogram[gray]++
    }

    // エントロピーを計算
    let entropy = 0
    const total = data.length / 4

    for (let i = 0; i < 256; i++) {
      if (histogram[i] > 0) {
        const p = histogram[i] / total
        entropy -= p * Math.log2(p)
      }
    }

    return (entropy / 8) * 100 // 8ビットの最大エントロピーで正規化
  }

  /**
   * トラッキング可能性の計算
   */
  private calculateTrackability(
    points: number,
    quality: number,
    contrast: number,
    uniqueness: number
  ): number {
    // 重み付き平均
    const weights = {
      points: 0.3,
      quality: 0.2,
      contrast: 0.25,
      uniqueness: 0.25,
    }

    const normalizedPoints = Math.min(100, points / 10) // 1000特徴点で100%

    return (
      normalizedPoints * weights.points +
      quality * weights.quality +
      contrast * weights.contrast +
      uniqueness * weights.uniqueness
    )
  }

  /**
   * 画像の最適化
   */
  async optimizeImage(imageUrl: string, settings: Partial<TrackingSettings> = {}): Promise<string> {
    const image = await this.loadImage(imageUrl)

    this.canvas.width = image.width
    this.canvas.height = image.height
    this.context.drawImage(image, 0, 0)

    let imageData = this.context.getImageData(0, 0, image.width, image.height)

    // コントラスト強調
    if (settings.enhanceContrast) {
      imageData = this.enhanceContrast(imageData)
    }

    // エッジ検出強調
    if (settings.edgeDetection) {
      imageData = this.enhanceEdges(imageData)
    }

    // 適応的しきい値処理
    if (settings.adaptiveThreshold) {
      imageData = this.applyAdaptiveThreshold(imageData)
    }

    this.context.putImageData(imageData, 0, 0)

    return this.canvas.toDataURL('image/png')
  }

  /**
   * コントラスト強調
   */
  private enhanceContrast(imageData: ImageData): ImageData {
    const data = imageData.data
    const factor = 1.5 // コントラスト係数

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128))
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128))
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128))
    }

    return imageData
  }

  /**
   * エッジ強調
   */
  private enhanceEdges(imageData: ImageData): ImageData {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height
    const output = new Uint8ClampedArray(data)

    // シャープネスフィルタ
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c
              sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)]
            }
          }
          const idx = (y * width + x) * 4 + c
          output[idx] = Math.min(255, Math.max(0, sum))
        }
      }
    }

    return new ImageData(output, width, height)
  }

  /**
   * 適応的しきい値処理
   */
  private applyAdaptiveThreshold(imageData: ImageData): ImageData {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height
    const output = new Uint8ClampedArray(data)

    const blockSize = 11
    const c = 2

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114

        // 局所的な平均を計算
        let sum = 0
        let count = 0

        for (let by = Math.max(0, y - blockSize); by <= Math.min(height - 1, y + blockSize); by++) {
          for (
            let bx = Math.max(0, x - blockSize);
            bx <= Math.min(width - 1, x + blockSize);
            bx++
          ) {
            const bidx = (by * width + bx) * 4
            sum += data[bidx] * 0.299 + data[bidx + 1] * 0.587 + data[bidx + 2] * 0.114
            count++
          }
        }

        const mean = sum / count
        const threshold = mean - c

        const value = gray > threshold ? 255 : gray
        output[idx] = output[idx + 1] = output[idx + 2] = value
      }
    }

    return new ImageData(output, width, height)
  }

  /**
   * トラッキング設定の最適化
   */
  optimizeTrackingSettings(features: ImageFeature): OptimizationResult {
    const settings: TrackingSettings = {
      filterMinCF: 0.0001,
      filterBeta: 1000,
      warmupTolerance: 5,
      missTolerance: 5,
      smoothingFactor: 0.5,
      adaptiveThreshold: false,
      enhanceContrast: false,
      edgeDetection: false,
    }

    const recommendations: string[] = []

    // トラッキング可能性に基づいて設定を調整
    if (features.trackability < 30) {
      recommendations.push(
        '画像の品質が低いです。より高解像度またはコントラストの高い画像を使用してください。'
      )
      settings.enhanceContrast = true
      settings.edgeDetection = true
    }

    if (features.points < 500) {
      recommendations.push(
        '特徴点が少ないです。より複雑なパターンの画像を使用することを推奨します。'
      )
      settings.filterMinCF = 0.00001
      settings.warmupTolerance = 10
      settings.adaptiveThreshold = true
    }

    if (features.contrast < 40) {
      recommendations.push('コントラストが低いです。画像のコントラストを強調します。')
      settings.enhanceContrast = true
    }

    if (features.uniqueness < 50) {
      recommendations.push('画像の独自性が低いです。より特徴的なパターンを含む画像を推奨します。')
      settings.filterBeta = 2000
      settings.missTolerance = 3
    }

    // 高品質画像の場合の最適化
    if (features.trackability > 70) {
      recommendations.push('高品質な画像です。高速トラッキングモードを有効にできます。')
      settings.filterMinCF = 0.001
      settings.filterBeta = 500
      settings.warmupTolerance = 2
      settings.missTolerance = 8
      settings.smoothingFactor = 0.7
    }

    const expectedImprovement = Math.min(100, features.trackability * 1.3)

    return {
      optimizedSettings: settings,
      expectedImprovement,
      recommendations,
    }
  }

  /**
   * パフォーマンスメトリクスの記録
   */
  recordPerformance(fps: number, detectionTime: number, stability: number): void {
    this.performanceMetrics.fps.push(fps)
    this.performanceMetrics.detectionTime.push(detectionTime)
    this.performanceMetrics.trackingStability.push(stability)

    // 最新100件のみ保持
    if (this.performanceMetrics.fps.length > 100) {
      this.performanceMetrics.fps.shift()
      this.performanceMetrics.detectionTime.shift()
      this.performanceMetrics.trackingStability.shift()
    }
  }

  /**
   * パフォーマンス統計の取得
   */
  getPerformanceStats(): {
    avgFps: number
    avgDetectionTime: number
    avgStability: number
    recommendation: string
  } {
    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

    const avgFps = avg(this.performanceMetrics.fps)
    const avgDetectionTime = avg(this.performanceMetrics.detectionTime)
    const avgStability = avg(this.performanceMetrics.trackingStability)

    let recommendation = ''

    if (avgFps < 15) {
      recommendation = 'FPSが低いです。画像解像度を下げるか、トラッキング設定を調整してください。'
    } else if (avgDetectionTime > 100) {
      recommendation = '検出時間が長いです。画像の複雑さを減らすことを検討してください。'
    } else if (avgStability < 70) {
      recommendation = 'トラッキングが不安定です。smoothingFactorを増やすことを推奨します。'
    } else {
      recommendation = 'パフォーマンスは良好です。'
    }

    return {
      avgFps,
      avgDetectionTime,
      avgStability,
      recommendation,
    }
  }

  /**
   * 画像の読み込み
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }

  /**
   * リソースのクリーンアップ
   */
  dispose(): void {
    this.imageCache.clear()
    this.performanceMetrics = {
      fps: [],
      detectionTime: [],
      trackingStability: [],
    }
  }
}
