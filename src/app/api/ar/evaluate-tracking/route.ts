import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 60

interface EvaluateTrackingRequest {
  imageBase64: string
  options?: {
    algorithm?: 'fast' | 'harris' | 'orb' | 'hybrid'
    quality?: 'low' | 'medium' | 'high' | 'auto'
    generateMindFile?: boolean
    detailedReport?: boolean
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body: EvaluateTrackingRequest = await request.json()

    if (!body.imageBase64) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 })
    }

    // Convert base64 to buffer
    const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Get image metadata and raw pixel data using sharp
    const image = sharp(imageBuffer)
    const metadata = await image.metadata()
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })

    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: 'Could not determine image dimensions' }, { status: 400 })
    }

    // Convert to grayscale for feature detection
    const grayscaleData = await sharp(imageBuffer).grayscale().raw().toBuffer()

    // Simple feature detection (server-side implementation)
    const features = detectFeaturesServerSide(grayscaleData, metadata.width, metadata.height, {
      algorithm: body.options?.algorithm || 'hybrid',
      quality: body.options?.quality || 'medium',
    })

    // Evaluate tracking quality
    const quality = evaluateTrackingQuality(
      grayscaleData,
      metadata.width,
      metadata.height,
      features
    )

    // Build response
    const response: any = {
      quality,
      features: {
        count: features.length,
        distribution: calculateFeatureDistribution(features),
        averageStrength: features.reduce((sum, f) => sum + f.strength, 0) / features.length || 0,
      },
      metadata: {
        imageWidth: metadata.width,
        imageHeight: metadata.height,
        algorithm: body.options?.algorithm || 'hybrid',
      },
    }

    // Generate detailed report if requested
    if (body.options?.detailedReport) {
      response.detailedReport = generateDetailedReport(quality)
    }

    // Generate optimized .mind file if requested
    if (body.options?.generateMindFile) {
      try {
        const mindData = generateMindFile(features, metadata.width!, metadata.height!, {
          quality: body.options?.quality || 'medium',
        })

        response.mindFile = {
          base64: mindData.toString('base64'),
          metadata: {
            featureCount: features.length,
            fileSize: mindData.length,
          },
        }
      } catch (error) {
        console.error('Failed to generate .mind file:', error)
        response.mindFile = { error: 'Failed to generate .mind file' }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error evaluating tracking quality:', error)
    return NextResponse.json({ error: 'Failed to evaluate tracking quality' }, { status: 500 })
  }
}

function calculateFeatureDistribution(features: any[]): any {
  const gridSize = 8
  const grid = Array(gridSize)
    .fill(0)
    .map(() => Array(gridSize).fill(0))

  for (const feature of features) {
    const gridX = Math.min(Math.floor(feature.x * gridSize), gridSize - 1)
    const gridY = Math.min(Math.floor(feature.y * gridSize), gridSize - 1)
    grid[gridY][gridX]++
  }

  // Calculate statistics
  let nonEmptyCells = 0
  let maxFeaturesPerCell = 0
  let minFeaturesPerCell = Infinity

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x] > 0) {
        nonEmptyCells++
        maxFeaturesPerCell = Math.max(maxFeaturesPerCell, grid[y][x])
        minFeaturesPerCell = Math.min(minFeaturesPerCell, grid[y][x])
      }
    }
  }

  return {
    coverage: (nonEmptyCells / (gridSize * gridSize)) * 100,
    uniformity: minFeaturesPerCell > 0 ? minFeaturesPerCell / maxFeaturesPerCell : 0,
    grid: grid,
  }
}

// Server-side feature detection
function detectFeaturesServerSide(
  grayscale: Buffer,
  width: number,
  height: number,
  options: any
): any[] {
  const features: any[] = []
  const threshold = options.quality === 'high' ? 10 : options.quality === 'low' ? 20 : 15
  const step = options.quality === 'high' ? 4 : options.quality === 'low' ? 16 : 8

  // Simple corner detection
  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const idx = y * width + x
      const center = grayscale[idx]

      // Calculate local variance
      let variance = 0
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue
          const neighborIdx = (y + dy) * width + (x + dx)
          variance += Math.abs(center - grayscale[neighborIdx])
        }
      }

      if (variance > threshold * 24) {
        features.push({
          x: x / width,
          y: y / height,
          scale: 1.0,
          orientation: 0,
          strength: Math.min(variance / (threshold * 24), 1.0),
        })
      }

      // Limit features
      if (features.length >= 1000) break
    }
    if (features.length >= 1000) break
  }

  return features
}

// Evaluate tracking quality
function evaluateTrackingQuality(
  grayscale: Buffer,
  width: number,
  height: number,
  features: any[]
): any {
  // Calculate statistics
  let sum = 0
  let min = 255
  let max = 0

  for (let i = 0; i < grayscale.length; i++) {
    sum += grayscale[i]
    if (grayscale[i] < min) min = grayscale[i]
    if (grayscale[i] > max) max = grayscale[i]
  }

  const mean = sum / grayscale.length
  const contrast = max > min ? (max - min) / (max + min) : 0

  // Calculate entropy
  const histogram = new Array(256).fill(0)
  for (let i = 0; i < grayscale.length; i++) {
    histogram[grayscale[i]]++
  }

  let entropy = 0
  for (let i = 0; i < 256; i++) {
    if (histogram[i] > 0) {
      const p = histogram[i] / grayscale.length
      entropy -= p * Math.log2(p)
    }
  }

  // Calculate scores
  const featureScore = Math.min(features.length / 5 + 20, 100)
  const textureScore = Math.min(entropy * 14, 100)
  const contrastScore = Math.min(contrast * 100, 100)
  const uniquenessScore = Math.min(entropy * 12 + features.length / 10, 100)
  const stabilityScore = featureScore * 0.4 + contrastScore * 0.3 + textureScore * 0.3

  const overall = Math.round(
    featureScore * 0.25 +
      uniquenessScore * 0.2 +
      textureScore * 0.2 +
      contrastScore * 0.15 +
      stabilityScore * 0.2
  )

  const recommendations: string[] = []

  if (featureScore < 50) {
    recommendations.push('画像により多くの詳細やパターンを追加してください')
  }
  if (contrastScore < 40) {
    recommendations.push('画像のコントラストを向上させてください')
  }
  if (textureScore < 40) {
    recommendations.push('より複雑なテクスチャや模様のある画像を使用してください')
  }
  if (overall > 80) {
    recommendations.push('この画像は優れたトラッキング性能を発揮します')
  }

  return {
    overall: Math.min(Math.max(overall, 0), 100),
    featureScore: Math.round(featureScore),
    uniquenessScore: Math.round(uniquenessScore),
    textureScore: Math.round(textureScore),
    contrastScore: Math.round(contrastScore),
    stabilityScore: Math.round(stabilityScore),
    recommendations,
  }
}

// Generate detailed report
function generateDetailedReport(quality: any): string {
  const getGrade = (score: number): string => {
    if (score >= 90) return 'Excellent'
    if (score >= 75) return 'Good'
    if (score >= 60) return 'Fair'
    if (score >= 40) return 'Poor'
    return 'Very Poor'
  }

  return `
=== ARトラッキング品質評価レポート ===

総合評価: ${quality.overall}/100 (${getGrade(quality.overall)})

詳細スコア:
- 特徴点品質: ${quality.featureScore}/100
- 一意性: ${quality.uniquenessScore}/100
- テクスチャ: ${quality.textureScore}/100
- コントラスト: ${quality.contrastScore}/100
- 安定性予測: ${quality.stabilityScore}/100

改善提案:
${quality.recommendations.map((r: string) => `• ${r}`).join('\n')}
  `.trim()
}

// Generate .mind file
function generateMindFile(features: any[], width: number, height: number, options: any): Buffer {
  const header = {
    version: '2.0.0',
    targetCount: 1,
    imageWidth: width,
    imageHeight: height,
    physicalWidth: (width * 25.4) / 72,
    physicalHeight: (height * 25.4) / 72,
    dpi: 72,
    timestamp: Date.now(),
    features: features.map((f) => ({
      x: f.x,
      y: f.y,
      scale: f.scale,
      orientation: f.orientation,
      strength: f.strength,
    })),
    metadata: {
      compiler: 'OptimizedTrackingEvaluator',
      featureCount: features.length,
    },
  }

  const jsonString = JSON.stringify(header)
  const encoder = new TextEncoder()
  const uint8Array = encoder.encode(jsonString)

  // Add magic number and version
  const magic = Buffer.from([0x4d, 0x49, 0x4e, 0x44]) // 'MIND'
  const version = Buffer.from([0x02, 0x00, 0x00, 0x00]) // Version 2.0.0.0

  return Buffer.concat([magic, version, uint8Array])
}

export async function GET() {
  return NextResponse.json({
    message: 'Tracking Evaluation API',
    endpoints: {
      POST: {
        description: 'Evaluate AR tracking quality for a marker image',
        body: {
          imageBase64: 'Base64 encoded image data',
          options: {
            algorithm: 'Feature detection algorithm (fast, harris, orb, hybrid)',
            quality: 'Processing quality (low, medium, high, auto)',
            generateMindFile: 'Generate optimized .mind file',
            detailedReport: 'Include detailed quality report',
          },
        },
        response: {
          quality: 'Tracking quality scores',
          features: 'Feature detection results',
          metadata: 'Image metadata',
          detailedReport: 'Detailed quality analysis (optional)',
          mindFile: 'Generated .mind file data (optional)',
        },
      },
    },
  })
}
