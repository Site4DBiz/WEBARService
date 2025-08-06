import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OptimizeRequest {
  action: 'optimize_image' | 'resize_image' | 'convert_format' | 'batch_optimize'
  imageUrl?: string
  imageBase64?: string
  bucketPath?: string
  options?: {
    width?: number
    height?: number
    quality?: number
    format?: 'jpeg' | 'png' | 'webp' | 'avif'
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
    preserveAspectRatio?: boolean
    compressionLevel?: number
  }
  batch?: Array<{
    imageUrl: string
    options: any
  }>
}

interface OptimizedImage {
  originalSize: number
  optimizedSize: number
  compressionRatio: number
  format: string
  dimensions: {
    width: number
    height: number
  }
  url?: string
  base64?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: OptimizeRequest = await req.json()
    let response: any = {}

    switch (body.action) {
      case 'optimize_image':
        response = await optimizeImage(supabase, body, user.id)
        break

      case 'resize_image':
        response = await resizeImage(supabase, body, user.id)
        break

      case 'convert_format':
        response = await convertImageFormat(supabase, body, user.id)
        break

      case 'batch_optimize':
        response = await batchOptimize(supabase, body.batch || [], user.id)
        break

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Image optimizer error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function optimizeImage(
  supabase: any,
  request: OptimizeRequest,
  userId: string
): Promise<OptimizedImage> {
  // Get image data
  const imageData = await getImageData(supabase, request)
  
  if (!imageData) {
    throw new Error('No image data provided')
  }

  const originalSize = imageData.byteLength

  // Default optimization options
  const options = {
    quality: request.options?.quality || 85,
    format: request.options?.format || 'jpeg',
    width: request.options?.width,
    height: request.options?.height,
    compressionLevel: request.options?.compressionLevel || 9,
  }

  // Apply optimizations based on format
  let optimizedData: Uint8Array
  let dimensions: { width: number; height: number }

  switch (options.format) {
    case 'jpeg':
      const result = await optimizeJPEG(imageData, options)
      optimizedData = result.data
      dimensions = result.dimensions
      break

    case 'png':
      const pngResult = await optimizePNG(imageData, options)
      optimizedData = pngResult.data
      dimensions = pngResult.dimensions
      break

    case 'webp':
      const webpResult = await optimizeWebP(imageData, options)
      optimizedData = webpResult.data
      dimensions = webpResult.dimensions
      break

    case 'avif':
      const avifResult = await optimizeAVIF(imageData, options)
      optimizedData = avifResult.data
      dimensions = avifResult.dimensions
      break

    default:
      throw new Error(`Unsupported format: ${options.format}`)
  }

  const optimizedSize = optimizedData.byteLength
  const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100

  // Save optimized image if bucket path is provided
  let url: string | undefined
  if (request.bucketPath) {
    const fileName = `${userId}/${Date.now()}_optimized.${options.format}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ar-content')
      .upload(fileName, optimizedData, {
        contentType: `image/${options.format}`,
        upsert: false,
      })

    if (!uploadError && uploadData) {
      const { data: urlData } = supabase.storage
        .from('ar-content')
        .getPublicUrl(uploadData.path)
      url = urlData.publicUrl
    }
  }

  // Return base64 if requested
  const base64 = request.imageBase64 
    ? `data:image/${options.format};base64,${btoa(String.fromCharCode(...optimizedData))}`
    : undefined

  return {
    originalSize,
    optimizedSize,
    compressionRatio,
    format: options.format,
    dimensions,
    url,
    base64,
  }
}

async function resizeImage(
  supabase: any,
  request: OptimizeRequest,
  userId: string
): Promise<OptimizedImage> {
  const imageData = await getImageData(supabase, request)
  
  if (!imageData) {
    throw new Error('No image data provided')
  }

  const options = {
    width: request.options?.width || 800,
    height: request.options?.height || 600,
    fit: request.options?.fit || 'contain',
    preserveAspectRatio: request.options?.preserveAspectRatio !== false,
    format: request.options?.format || 'jpeg',
    quality: request.options?.quality || 85,
  }

  // Resize logic
  const resizedData = await performResize(imageData, options)

  return {
    originalSize: imageData.byteLength,
    optimizedSize: resizedData.data.byteLength,
    compressionRatio: ((imageData.byteLength - resizedData.data.byteLength) / imageData.byteLength) * 100,
    format: options.format,
    dimensions: resizedData.dimensions,
    base64: `data:image/${options.format};base64,${btoa(String.fromCharCode(...resizedData.data))}`,
  }
}

async function convertImageFormat(
  supabase: any,
  request: OptimizeRequest,
  userId: string
): Promise<OptimizedImage> {
  const imageData = await getImageData(supabase, request)
  
  if (!imageData) {
    throw new Error('No image data provided')
  }

  const targetFormat = request.options?.format || 'webp'
  const quality = request.options?.quality || 85

  // Convert format
  const convertedData = await performFormatConversion(imageData, targetFormat, quality)

  return {
    originalSize: imageData.byteLength,
    optimizedSize: convertedData.data.byteLength,
    compressionRatio: ((imageData.byteLength - convertedData.data.byteLength) / imageData.byteLength) * 100,
    format: targetFormat,
    dimensions: convertedData.dimensions,
    base64: `data:image/${targetFormat};base64,${btoa(String.fromCharCode(...convertedData.data))}`,
  }
}

async function batchOptimize(
  supabase: any,
  batch: Array<{ imageUrl: string; options: any }>,
  userId: string
): Promise<OptimizedImage[]> {
  const results: OptimizedImage[] = []

  for (const item of batch) {
    try {
      const result = await optimizeImage(
        supabase,
        {
          action: 'optimize_image',
          imageUrl: item.imageUrl,
          options: item.options,
        },
        userId
      )
      results.push(result)
    } catch (error) {
      console.error(`Failed to optimize ${item.imageUrl}:`, error)
      // Continue with other images
    }
  }

  return results
}

async function getImageData(supabase: any, request: OptimizeRequest): Promise<Uint8Array | null> {
  if (request.imageBase64) {
    // Decode base64
    const base64Data = request.imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }

  if (request.imageUrl) {
    // Fetch from URL
    const response = await fetch(request.imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  if (request.bucketPath) {
    // Download from Supabase storage
    const { data, error } = await supabase.storage
      .from('ar-content')
      .download(request.bucketPath)
    
    if (error) {
      throw error
    }
    
    const arrayBuffer = await data.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  return null
}

// Placeholder optimization functions - in production, use actual image processing libraries
async function optimizeJPEG(
  data: Uint8Array,
  options: any
): Promise<{ data: Uint8Array; dimensions: { width: number; height: number } }> {
  // In production, use libraries like sharp, jimp, or imagemagick
  // This is a simplified placeholder
  return {
    data: data,
    dimensions: { width: options.width || 800, height: options.height || 600 },
  }
}

async function optimizePNG(
  data: Uint8Array,
  options: any
): Promise<{ data: Uint8Array; dimensions: { width: number; height: number } }> {
  return {
    data: data,
    dimensions: { width: options.width || 800, height: options.height || 600 },
  }
}

async function optimizeWebP(
  data: Uint8Array,
  options: any
): Promise<{ data: Uint8Array; dimensions: { width: number; height: number } }> {
  return {
    data: data,
    dimensions: { width: options.width || 800, height: options.height || 600 },
  }
}

async function optimizeAVIF(
  data: Uint8Array,
  options: any
): Promise<{ data: Uint8Array; dimensions: { width: number; height: number } }> {
  return {
    data: data,
    dimensions: { width: options.width || 800, height: options.height || 600 },
  }
}

async function performResize(
  data: Uint8Array,
  options: any
): Promise<{ data: Uint8Array; dimensions: { width: number; height: number } }> {
  // Placeholder resize logic
  return {
    data: data,
    dimensions: { width: options.width, height: options.height },
  }
}

async function performFormatConversion(
  data: Uint8Array,
  format: string,
  quality: number
): Promise<{ data: Uint8Array; dimensions: { width: number; height: number } }> {
  // Placeholder conversion logic
  return {
    data: data,
    dimensions: { width: 800, height: 600 },
  }
}