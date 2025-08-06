// 高度な特徴点検出アルゴリズム for AR tracking

export interface Feature {
  x: number
  y: number
  scale: number
  orientation: number
  strength: number
  descriptor?: number[]
}

export interface FeatureDetectionOptions {
  algorithm?: 'fast' | 'harris' | 'orb' | 'hybrid'
  maxFeatures?: number
  threshold?: number
  quality?: 'low' | 'medium' | 'high'
  nonMaxSuppression?: boolean
}

// FAST (Features from Accelerated Segment Test) コーナー検出
export class FASTDetector {
  private threshold: number
  private nonMaxSuppression: boolean

  constructor(threshold: number = 20, nonMaxSuppression: boolean = true) {
    this.threshold = threshold
    this.nonMaxSuppression = nonMaxSuppression
  }

  detect(grayscale: Uint8Array, width: number, height: number): Feature[] {
    const features: Feature[] = []
    const scores = new Float32Array(width * height)

    // Bresenham circle points (radius = 3)
    const circle = [
      [0, 3],
      [1, 3],
      [2, 2],
      [3, 1],
      [3, 0],
      [3, -1],
      [2, -2],
      [1, -3],
      [0, -3],
      [-1, -3],
      [-2, -2],
      [-3, -1],
      [-3, 0],
      [-3, 1],
      [-2, 2],
      [-1, 3],
    ]

    // FAST-9 detector (9 continuous pixels)
    for (let y = 3; y < height - 3; y++) {
      for (let x = 3; x < width - 3; x++) {
        const idx = y * width + x
        const center = grayscale[idx]
        const threshold = this.threshold

        // Quick test: check pixels at 1, 5, 9, 13
        const p1 = grayscale[(y + circle[0][1]) * width + (x + circle[0][0])]
        const p5 = grayscale[(y + circle[4][1]) * width + (x + circle[4][0])]
        const p9 = grayscale[(y + circle[8][1]) * width + (x + circle[8][0])]
        const p13 = grayscale[(y + circle[12][1]) * width + (x + circle[12][0])]

        const brightCount = [p1, p5, p9, p13].filter((p) => p > center + threshold).length
        const darkCount = [p1, p5, p9, p13].filter((p) => p < center - threshold).length

        if (brightCount < 3 && darkCount < 3) continue

        // Full circle check
        const circlePixels: number[] = []
        for (const [dx, dy] of circle) {
          const pixel = grayscale[(y + dy) * width + (x + dx)]
          circlePixels.push(pixel)
        }

        // Check for continuous segment
        let isBright = false
        let isDark = false

        for (let start = 0; start < 16; start++) {
          let brightSegment = 0
          let darkSegment = 0

          for (let i = 0; i < 9; i++) {
            const pixel = circlePixels[(start + i) % 16]
            if (pixel > center + threshold) {
              brightSegment++
            } else if (pixel < center - threshold) {
              darkSegment++
            }
          }

          if (brightSegment === 9) isBright = true
          if (darkSegment === 9) isDark = true
        }

        if (isBright || isDark) {
          // Calculate corner score
          let score = 0
          for (const pixel of circlePixels) {
            score += Math.abs(pixel - center)
          }
          scores[idx] = score

          features.push({
            x: x / width,
            y: y / height,
            scale: 1.0,
            orientation: 0,
            strength: score / (16 * 255),
          })
        }
      }
    }

    // Non-maximum suppression
    if (this.nonMaxSuppression) {
      return this.applyNonMaxSuppression(features, scores, width, height)
    }

    return features
  }

  private applyNonMaxSuppression(
    features: Feature[],
    scores: Float32Array,
    width: number,
    height: number
  ): Feature[] {
    const suppressed: Feature[] = []
    const windowSize = 3

    for (const feature of features) {
      const x = Math.floor(feature.x * width)
      const y = Math.floor(feature.y * height)
      const idx = y * width + x
      const score = scores[idx]

      let isMaximum = true
      for (let dy = -windowSize; dy <= windowSize; dy++) {
        for (let dx = -windowSize; dx <= windowSize; dx++) {
          if (dx === 0 && dy === 0) continue

          const nx = x + dx
          const ny = y + dy

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nidx = ny * width + nx
            if (scores[nidx] > score) {
              isMaximum = false
              break
            }
          }
        }
        if (!isMaximum) break
      }

      if (isMaximum) {
        suppressed.push(feature)
      }
    }

    return suppressed
  }
}

// Harris Corner Detector
export class HarrisDetector {
  private k: number
  private threshold: number

  constructor(k: number = 0.04, threshold: number = 0.01) {
    this.k = k
    this.threshold = threshold
  }

  detect(grayscale: Uint8Array, width: number, height: number): Feature[] {
    const features: Feature[] = []

    // Compute gradients using Sobel operators
    const Ix = new Float32Array(width * height)
    const Iy = new Float32Array(width * height)

    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0
        let gy = 0

        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const idx = (y + j) * width + (x + i)
            const kernelIdx = (j + 1) * 3 + (i + 1)
            gx += grayscale[idx] * sobelX[kernelIdx]
            gy += grayscale[idx] * sobelY[kernelIdx]
          }
        }

        const idx = y * width + x
        Ix[idx] = gx
        Iy[idx] = gy
      }
    }

    // Compute Harris response
    const windowSize = 3
    const offset = Math.floor(windowSize / 2)

    for (let y = offset; y < height - offset; y++) {
      for (let x = offset; x < width - offset; x++) {
        let Ixx = 0
        let Iyy = 0
        let Ixy = 0

        // Compute structure tensor
        for (let j = -offset; j <= offset; j++) {
          for (let i = -offset; i <= offset; i++) {
            const idx = (y + j) * width + (x + i)
            const ix = Ix[idx]
            const iy = Iy[idx]

            Ixx += ix * ix
            Iyy += iy * iy
            Ixy += ix * iy
          }
        }

        // Harris response: R = det(M) - k * trace(M)^2
        const det = Ixx * Iyy - Ixy * Ixy
        const trace = Ixx + Iyy
        const response = det - this.k * trace * trace

        if (response > this.threshold) {
          features.push({
            x: x / width,
            y: y / height,
            scale: 1.0,
            orientation: Math.atan2(Iy[y * width + x], Ix[y * width + x]),
            strength: Math.min(response, 1.0),
          })
        }
      }
    }

    return features
  }
}

// ORB (Oriented FAST and Rotated BRIEF) inspired feature detector
export class ORBDetector {
  private fastDetector: FASTDetector
  private patchSize: number

  constructor(threshold: number = 20, patchSize: number = 31) {
    this.fastDetector = new FASTDetector(threshold, true)
    this.patchSize = patchSize
  }

  detect(grayscale: Uint8Array, width: number, height: number): Feature[] {
    // Detect FAST corners
    const features = this.fastDetector.detect(grayscale, width, height)

    // Compute orientation for each feature
    for (const feature of features) {
      const x = Math.floor(feature.x * width)
      const y = Math.floor(feature.y * height)

      // Compute image moments
      let m00 = 0,
        m01 = 0,
        m10 = 0
      const radius = Math.floor(this.patchSize / 2)

      for (let j = -radius; j <= radius; j++) {
        for (let i = -radius; i <= radius; i++) {
          const nx = x + i
          const ny = y + j

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const intensity = grayscale[ny * width + nx]
            m00 += intensity
            m01 += j * intensity
            m10 += i * intensity
          }
        }
      }

      // Compute centroid and orientation
      if (m00 > 0) {
        const cx = m10 / m00
        const cy = m01 / m00
        feature.orientation = Math.atan2(cy, cx)
      }

      // Generate simplified descriptor (optional)
      feature.descriptor = this.generateDescriptor(
        grayscale,
        width,
        height,
        x,
        y,
        feature.orientation
      )
    }

    return features
  }

  private generateDescriptor(
    grayscale: Uint8Array,
    width: number,
    height: number,
    x: number,
    y: number,
    orientation: number
  ): number[] {
    const descriptor: number[] = []
    const patchRadius = Math.floor(this.patchSize / 2)

    // Simple intensity-based descriptor (simplified BRIEF)
    const cos = Math.cos(orientation)
    const sin = Math.sin(orientation)

    for (let i = 0; i < 8; i++) {
      let sum = 0
      const angle = (i * Math.PI) / 4

      for (let r = 0; r < patchRadius; r += 2) {
        const dx = Math.cos(angle) * r
        const dy = Math.sin(angle) * r

        // Rotate by feature orientation
        const rx = dx * cos - dy * sin
        const ry = dx * sin + dy * cos

        const sx = Math.round(x + rx)
        const sy = Math.round(y + ry)

        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          sum += grayscale[sy * width + sx]
        }
      }

      descriptor.push(sum / patchRadius)
    }

    return descriptor
  }
}

// Hybrid detector combining multiple algorithms
export class HybridFeatureDetector {
  private fastDetector: FASTDetector
  private harrisDetector: HarrisDetector
  private orbDetector: ORBDetector

  constructor() {
    this.fastDetector = new FASTDetector(20, true)
    this.harrisDetector = new HarrisDetector(0.04, 0.01)
    this.orbDetector = new ORBDetector(15, 31)
  }

  detect(
    grayscale: Uint8Array,
    width: number,
    height: number,
    options: FeatureDetectionOptions = {}
  ): Feature[] {
    const maxFeatures = options.maxFeatures || 500
    const algorithm = options.algorithm || 'hybrid'

    let features: Feature[] = []

    switch (algorithm) {
      case 'fast':
        features = this.fastDetector.detect(grayscale, width, height)
        break

      case 'harris':
        features = this.harrisDetector.detect(grayscale, width, height)
        break

      case 'orb':
        features = this.orbDetector.detect(grayscale, width, height)
        break

      case 'hybrid':
      default:
        // Combine multiple detectors for robustness
        const fastFeatures = this.fastDetector.detect(grayscale, width, height)
        const harrisFeatures = this.harrisDetector.detect(grayscale, width, height)

        // Merge and deduplicate
        features = this.mergeFeatures(fastFeatures, harrisFeatures)
        break
    }

    // Sort by strength and limit features
    features.sort((a, b) => b.strength - a.strength)

    return features.slice(0, maxFeatures)
  }

  private mergeFeatures(features1: Feature[], features2: Feature[]): Feature[] {
    const merged: Feature[] = [...features1]
    const threshold = 0.01 // Distance threshold for duplicate detection

    for (const f2 of features2) {
      let isDuplicate = false

      for (const f1 of features1) {
        const distance = Math.sqrt(Math.pow(f1.x - f2.x, 2) + Math.pow(f1.y - f2.y, 2))

        if (distance < threshold) {
          isDuplicate = true
          break
        }
      }

      if (!isDuplicate) {
        merged.push(f2)
      }
    }

    return merged
  }
}

// Main feature detection function
export function detectFeatures(
  imageData: ImageData,
  options: FeatureDetectionOptions = {}
): Feature[] {
  const { width, height, data } = imageData

  // Convert to grayscale
  const grayscale = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    grayscale[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
  }

  const detector = new HybridFeatureDetector()
  return detector.detect(grayscale, width, height, options)
}
