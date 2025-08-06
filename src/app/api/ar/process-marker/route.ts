import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  validateMarkerImage,
  processMarkerImage,
  calculateMarkerQualityScore,
  generateMarkerThumbnail,
  prepareForMindAR,
} from '@/lib/utils/marker-processor'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ProcessMarkerRequest {
  imageBase64: string
  options?: {
    generateThumbnail?: boolean
    optimize?: boolean
    calculateQuality?: boolean
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
    const body: ProcessMarkerRequest = await request.json()

    if (!body.imageBase64) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 })
    }

    // Convert base64 to buffer
    const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Validate the image
    const validation = await validateMarkerImage(imageBuffer)

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid marker image',
          details: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 }
      )
    }

    const response: any = {
      validation: {
        isValid: validation.isValid,
        warnings: validation.warnings,
        metadata: validation.metadata,
      },
    }

    // Process and optimize the image if requested
    if (body.options?.optimize) {
      const processed = await prepareForMindAR(imageBuffer)
      response.processed = {
        base64: processed.base64,
        metadata: processed.metadata,
      }
    }

    // Calculate quality score if requested
    if (body.options?.calculateQuality) {
      const qualityScore = await calculateMarkerQualityScore(imageBuffer)
      response.qualityScore = qualityScore

      // Add quality feedback
      if (qualityScore < 50) {
        response.qualityFeedback =
          'Low quality: Consider using a higher resolution image with better contrast'
      } else if (qualityScore < 70) {
        response.qualityFeedback =
          'Medium quality: Image should work but tracking may be less stable'
      } else {
        response.qualityFeedback = 'High quality: Image is well-suited for AR tracking'
      }
    }

    // Generate thumbnail if requested
    if (body.options?.generateThumbnail) {
      const thumbnailBuffer = await generateMarkerThumbnail(imageBuffer)
      const thumbnailBase64 = thumbnailBuffer.toString('base64')
      response.thumbnail = `data:image/jpeg;base64,${thumbnailBase64}`
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error processing marker:', error)
    return NextResponse.json({ error: 'Failed to process marker image' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Marker processing API',
    endpoints: {
      POST: {
        description: 'Process and validate a marker image for AR tracking',
        body: {
          imageBase64: 'Base64 encoded image data',
          options: {
            generateThumbnail: 'Generate a thumbnail (optional)',
            optimize: 'Optimize image for AR tracking (optional)',
            calculateQuality: 'Calculate quality score (optional)',
          },
        },
      },
    },
  })
}
