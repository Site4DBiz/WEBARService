import sharp from 'sharp'

export interface MarkerProcessingOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  grayscale?: boolean
  contrast?: number
  sharpen?: boolean
}

export interface ProcessedMarkerResult {
  buffer: Buffer
  metadata: {
    width: number
    height: number
    format: string
    size: number
  }
  base64: string
}

export interface MarkerValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata?: {
    width: number
    height: number
    format: string
    aspectRatio: number
    fileSize: number
  }
}

const DEFAULT_OPTIONS: MarkerProcessingOptions = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 85,
  format: 'jpeg',
  grayscale: false,
  contrast: 1.0,
  sharpen: true,
}

const MIN_DIMENSION = 300
const MAX_DIMENSION = 4096
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const SUPPORTED_FORMATS = ['jpeg', 'jpg', 'png', 'webp']

/**
 * Validate marker image for AR tracking suitability
 */
export async function validateMarkerImage(buffer: Buffer): Promise<MarkerValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const metadata = await sharp(buffer).metadata()

    if (!metadata.width || !metadata.height) {
      return {
        isValid: false,
        errors: ['Could not determine image dimensions'],
        warnings,
      }
    }

    // Check format
    if (!metadata.format || !SUPPORTED_FORMATS.includes(metadata.format)) {
      errors.push(
        `Unsupported format: ${metadata.format}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
      )
    }

    // Check dimensions
    if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
      errors.push(`Image dimensions too small. Minimum: ${MIN_DIMENSION}x${MIN_DIMENSION}px`)
    }

    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      errors.push(`Image dimensions too large. Maximum: ${MAX_DIMENSION}x${MAX_DIMENSION}px`)
    }

    // Check aspect ratio
    const aspectRatio = metadata.width / metadata.height
    if (aspectRatio < 0.5 || aspectRatio > 2.0) {
      warnings.push('Unusual aspect ratio. Square or near-square images work best for AR tracking')
    }

    // Check file size
    const fileSize = buffer.byteLength
    if (fileSize > MAX_FILE_SIZE) {
      errors.push(
        `File size too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      )
    }

    // Check for transparency (PNG with alpha channel)
    if (metadata.channels === 4 && metadata.format === 'png') {
      warnings.push('Image has transparency. Opaque images work better for AR tracking')
    }

    // Check color space
    if (metadata.space && !['srgb', 'rgb'].includes(metadata.space.toLowerCase())) {
      warnings.push(`Non-standard color space: ${metadata.space}. sRGB recommended`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        aspectRatio,
        fileSize,
      },
    }
  } catch (error) {
    return {
      isValid: false,
      errors: [
        `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
      warnings,
    }
  }
}

/**
 * Process and optimize marker image for AR tracking
 */
export async function processMarkerImage(
  buffer: Buffer,
  options: MarkerProcessingOptions = {}
): Promise<ProcessedMarkerResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  try {
    let pipeline = sharp(buffer)

    // Get original metadata
    const metadata = await sharp(buffer).metadata()

    if (!metadata.width || !metadata.height) {
      throw new Error('Could not determine image dimensions')
    }

    // Resize if needed
    if (opts.maxWidth || opts.maxHeight) {
      pipeline = pipeline.resize(opts.maxWidth, opts.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    }

    // Convert to grayscale if requested (can improve tracking in some cases)
    if (opts.grayscale) {
      pipeline = pipeline.grayscale()
    }

    // Adjust contrast for better feature detection
    if (opts.contrast && opts.contrast !== 1.0) {
      pipeline = pipeline.linear(opts.contrast, -(128 * (opts.contrast - 1)))
    }

    // Sharpen for better edge detection
    if (opts.sharpen) {
      pipeline = pipeline.sharpen()
    }

    // Convert to specified format
    switch (opts.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({
          quality: opts.quality,
          progressive: true,
          mozjpeg: true,
        })
        break
      case 'png':
        pipeline = pipeline.png({
          quality: opts.quality,
          compressionLevel: 9,
        })
        break
      case 'webp':
        pipeline = pipeline.webp({
          quality: opts.quality,
          effort: 6,
        })
        break
    }

    const processedBuffer = await pipeline.toBuffer({ resolveWithObject: true })
    const base64 = processedBuffer.data.toString('base64')

    return {
      buffer: processedBuffer.data,
      metadata: {
        width: processedBuffer.info.width,
        height: processedBuffer.info.height,
        format: processedBuffer.info.format,
        size: processedBuffer.info.size,
      },
      base64: `data:image/${opts.format};base64,${base64}`,
    }
  } catch (error) {
    throw new Error(
      `Failed to process marker image: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Calculate image quality score for AR tracking
 */
export async function calculateMarkerQualityScore(buffer: Buffer): Promise<number> {
  try {
    const metadata = await sharp(buffer).metadata()
    const stats = await sharp(buffer).stats()

    let score = 0
    const maxScore = 100

    // Check resolution (30 points)
    if (metadata.width && metadata.height) {
      const pixels = metadata.width * metadata.height
      if (pixels >= 1000000)
        score += 30 // 1MP or more
      else if (pixels >= 500000)
        score += 20 // 500K-1MP
      else if (pixels >= 250000) score += 10 // 250K-500K
    }

    // Check contrast (30 points)
    if (stats.channels && stats.channels.length > 0) {
      const channel = stats.channels[0]
      const range = channel.max - channel.min
      if (range > 200) score += 30
      else if (range > 150) score += 20
      else if (range > 100) score += 10
    }

    // Check sharpness (entropy as proxy) (20 points)
    if (stats.entropy) {
      if (stats.entropy > 7) score += 20
      else if (stats.entropy > 6) score += 15
      else if (stats.entropy > 5) score += 10
    }

    // Check aspect ratio (10 points)
    if (metadata.width && metadata.height) {
      const aspectRatio = metadata.width / metadata.height
      if (aspectRatio >= 0.8 && aspectRatio <= 1.2)
        score += 10 // Near square
      else if (aspectRatio >= 0.6 && aspectRatio <= 1.6) score += 5
    }

    // Check format (10 points)
    if (metadata.format && ['jpeg', 'png'].includes(metadata.format)) {
      score += 10
    }

    return Math.min(score, maxScore)
  } catch (error) {
    console.error('Failed to calculate quality score:', error)
    return 0
  }
}

/**
 * Generate thumbnail for marker preview
 */
export async function generateMarkerThumbnail(
  buffer: Buffer,
  width: number = 256,
  height: number = 256
): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer()
  } catch (error) {
    throw new Error(
      `Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Extract dominant colors from marker image
 */
export async function extractMarkerColors(buffer: Buffer, count: number = 5): Promise<string[]> {
  try {
    const { dominant } = await sharp(buffer)
      .resize(100, 100, { fit: 'cover' })
      .toBuffer()
      .then(async (resizedBuffer) => {
        const stats = await sharp(resizedBuffer).stats()
        return {
          dominant: stats.dominant
            ? `#${stats.dominant.r.toString(16).padStart(2, '0')}${stats.dominant.g.toString(16).padStart(2, '0')}${stats.dominant.b.toString(16).padStart(2, '0')}`
            : '#000000',
        }
      })

    // For now, return just the dominant color
    // In a full implementation, you'd use a color quantization algorithm
    return [dominant]
  } catch (error) {
    console.error('Failed to extract colors:', error)
    return []
  }
}

/**
 * Prepare marker image for MindAR compilation
 */
export async function prepareForMindAR(buffer: Buffer): Promise<ProcessedMarkerResult> {
  // MindAR works best with specific image characteristics
  return processMarkerImage(buffer, {
    maxWidth: 1024,
    maxHeight: 1024,
    format: 'jpeg',
    quality: 90,
    sharpen: true,
    contrast: 1.1, // Slightly increase contrast for better feature detection
  })
}
