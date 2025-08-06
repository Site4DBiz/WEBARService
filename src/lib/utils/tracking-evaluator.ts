// ARトラッキング品質評価システム

import { Feature } from './feature-detector'

export interface TrackingQuality {
  overall: number // 0-100
  featureScore: number // 特徴点の質
  uniquenessScore: number // 一意性スコア
  textureScore: number // テクスチャの豊富さ
  contrastScore: number // コントラスト
  stabilityScore: number // トラッキング安定性の予測
  recommendations: string[]
}

export interface ImageStatistics {
  mean: number
  std: number
  entropy: number
  contrast: number
  histogram: number[]
}

export class TrackingEvaluator {
  // 画像の統計情報を計算
  private computeStatistics(grayscale: Uint8Array): ImageStatistics {
    const n = grayscale.length

    // 平均値計算
    let sum = 0
    for (let i = 0; i < n; i++) {
      sum += grayscale[i]
    }
    const mean = sum / n

    // 標準偏差計算
    let variance = 0
    for (let i = 0; i < n; i++) {
      variance += Math.pow(grayscale[i] - mean, 2)
    }
    const std = Math.sqrt(variance / n)

    // ヒストグラム計算
    const histogram = new Array(256).fill(0)
    for (let i = 0; i < n; i++) {
      histogram[grayscale[i]]++
    }

    // エントロピー計算
    let entropy = 0
    for (let i = 0; i < 256; i++) {
      if (histogram[i] > 0) {
        const p = histogram[i] / n
        entropy -= p * Math.log2(p)
      }
    }

    // コントラスト計算（Michelsonコントラスト）
    let min = 255
    let max = 0
    for (let i = 0; i < n; i++) {
      if (grayscale[i] < min) min = grayscale[i]
      if (grayscale[i] > max) max = grayscale[i]
    }
    const contrast = max > min ? (max - min) / (max + min) : 0

    return {
      mean,
      std,
      entropy,
      contrast,
      histogram,
    }
  }

  // 特徴点の分布を評価
  private evaluateFeatureDistribution(features: Feature[], width: number, height: number): number {
    if (features.length === 0) return 0

    // グリッドベースの分布評価
    const gridSize = 8
    const grid = Array(gridSize)
      .fill(0)
      .map(() => Array(gridSize).fill(0))

    for (const feature of features) {
      const gridX = Math.min(Math.floor(feature.x * gridSize), gridSize - 1)
      const gridY = Math.min(Math.floor(feature.y * gridSize), gridSize - 1)
      grid[gridY][gridX]++
    }

    // 分布の均一性を評価
    let nonEmptyCells = 0
    let maxFeaturesPerCell = 0

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (grid[y][x] > 0) nonEmptyCells++
        if (grid[y][x] > maxFeaturesPerCell) {
          maxFeaturesPerCell = grid[y][x]
        }
      }
    }

    const coverage = nonEmptyCells / (gridSize * gridSize)
    const uniformity =
      maxFeaturesPerCell > 0
        ? 1 - (maxFeaturesPerCell - features.length / (gridSize * gridSize)) / maxFeaturesPerCell
        : 0

    return (coverage * 0.6 + uniformity * 0.4) * 100
  }

  // 特徴点の強度を評価
  private evaluateFeatureStrength(features: Feature[]): number {
    if (features.length === 0) return 0

    const strengths = features.map((f) => f.strength)
    const avgStrength = strengths.reduce((a, b) => a + b, 0) / strengths.length

    // 上位25%の特徴点の平均強度も考慮
    const sorted = [...strengths].sort((a, b) => b - a)
    const topQuartile = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.25)))
    const topAvg = topQuartile.reduce((a, b) => a + b, 0) / topQuartile.length

    return Math.min((avgStrength * 0.4 + topAvg * 0.6) * 100, 100)
  }

  // 画像の一意性を評価
  private evaluateUniqueness(grayscale: Uint8Array, width: number, height: number): number {
    // 局所的なパターンの多様性を評価
    const patchSize = 16
    const patches: Set<string> = new Set()

    for (let y = 0; y < height - patchSize; y += patchSize / 2) {
      for (let x = 0; x < width - patchSize; x += patchSize / 2) {
        // パッチのハッシュを生成
        let hash = ''
        for (let py = 0; py < patchSize; py += 4) {
          for (let px = 0; px < patchSize; px += 4) {
            const idx = (y + py) * width + (x + px)
            hash += Math.floor(grayscale[idx] / 32).toString()
          }
        }
        patches.add(hash)
      }
    }

    const maxPatches = Math.floor((width / (patchSize / 2)) * (height / (patchSize / 2)))
    const uniqueness = Math.min(patches.size / maxPatches, 1) * 100

    return uniqueness
  }

  // トラッキング安定性を予測
  private predictStability(
    features: Feature[],
    statistics: ImageStatistics,
    distributionScore: number
  ): number {
    // 複数の要因を組み合わせて安定性を予測
    const featureCount = Math.min(features.length / 100, 1) * 30
    const contrastFactor = statistics.contrast * 25
    const entropyFactor = Math.min(statistics.entropy / 7, 1) * 20
    const distributionFactor = distributionScore * 0.25

    return Math.min(featureCount + contrastFactor + entropyFactor + distributionFactor, 100)
  }

  // 改善提案を生成
  private generateRecommendations(quality: TrackingQuality): string[] {
    const recommendations: string[] = []

    if (quality.featureScore < 50) {
      recommendations.push('画像により多くの詳細やパターンを追加してください')
    }

    if (quality.contrastScore < 40) {
      recommendations.push('画像のコントラストを向上させてください')
    }

    if (quality.textureScore < 40) {
      recommendations.push('より複雑なテクスチャや模様のある画像を使用してください')
    }

    if (quality.uniquenessScore < 50) {
      recommendations.push('より特徴的で一意性の高い画像を選択してください')
    }

    if (quality.stabilityScore < 60) {
      recommendations.push(
        'トラッキング安定性を向上させるため、より鮮明で詳細な画像を使用してください'
      )
    }

    if (recommendations.length === 0 && quality.overall > 80) {
      recommendations.push('この画像は優れたトラッキング性能を発揮します')
    }

    return recommendations
  }

  // メイン評価関数
  evaluate(imageData: ImageData, features: Feature[]): TrackingQuality {
    const { width, height, data } = imageData

    // グレースケール変換
    const grayscale = new Uint8Array(width * height)
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4]
      const g = data[i * 4 + 1]
      const b = data[i * 4 + 2]
      grayscale[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
    }

    // 各種評価指標を計算
    const statistics = this.computeStatistics(grayscale)
    const distributionScore = this.evaluateFeatureDistribution(features, width, height)
    const strengthScore = this.evaluateFeatureStrength(features)
    const uniquenessScore = this.evaluateUniqueness(grayscale, width, height)

    // スコアを正規化
    const featureScore = Math.min(features.length / 3 + strengthScore * 0.5, 100)
    const textureScore = Math.min(statistics.entropy * 14, 100)
    const contrastScore = Math.min(statistics.contrast * 100, 100)
    const stabilityScore = this.predictStability(features, statistics, distributionScore)

    // 総合スコア計算（重み付け平均）
    const overall = Math.round(
      featureScore * 0.25 +
        uniquenessScore * 0.2 +
        textureScore * 0.2 +
        contrastScore * 0.15 +
        stabilityScore * 0.2
    )

    const quality: TrackingQuality = {
      overall: Math.min(Math.max(overall, 0), 100),
      featureScore: Math.round(featureScore),
      uniquenessScore: Math.round(uniquenessScore),
      textureScore: Math.round(textureScore),
      contrastScore: Math.round(contrastScore),
      stabilityScore: Math.round(stabilityScore),
      recommendations: [],
    }

    quality.recommendations = this.generateRecommendations(quality)

    return quality
  }

  // 詳細なレポートを生成
  generateDetailedReport(quality: TrackingQuality): string {
    const getGrade = (score: number): string => {
      if (score >= 90) return 'Excellent'
      if (score >= 75) return 'Good'
      if (score >= 60) return 'Fair'
      if (score >= 40) return 'Poor'
      return 'Very Poor'
    }

    const report = `
=== ARトラッキング品質評価レポート ===

総合評価: ${quality.overall}/100 (${getGrade(quality.overall)})

詳細スコア:
- 特徴点品質: ${quality.featureScore}/100 (${getGrade(quality.featureScore)})
  画像から検出される特徴点の数と質を評価

- 一意性: ${quality.uniquenessScore}/100 (${getGrade(quality.uniquenessScore)})
  画像パターンの独自性と識別可能性を評価

- テクスチャ: ${quality.textureScore}/100 (${getGrade(quality.textureScore)})
  画像の詳細度と複雑さを評価

- コントラスト: ${quality.contrastScore}/100 (${getGrade(quality.contrastScore)})
  明暗の差と視認性を評価

- 安定性予測: ${quality.stabilityScore}/100 (${getGrade(quality.stabilityScore)})
  実際のトラッキング時の安定性を予測

改善提案:
${quality.recommendations.map((r) => `• ${r}`).join('\n')}

推奨事項:
${
  quality.overall >= 75
    ? '✅ この画像はARトラッキングに適しています'
    : '⚠️ トラッキング品質を向上させるため、上記の改善提案を検討してください'
}
    `.trim()

    return report
  }
}
