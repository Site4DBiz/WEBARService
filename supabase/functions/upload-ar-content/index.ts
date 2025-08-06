import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface UploadRequest {
  title: string
  description?: string
  markerFile?: {
    name: string
    type: string
    base64: string
  }
  modelFile?: {
    name: string
    type: string
    base64: string
  }
  isPublic?: boolean
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const body: UploadRequest = await req.json()
    const { title, description, markerFile, modelFile, isPublic = false } = body

    // Validate required fields
    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    let markerUrl: string | null = null
    let modelUrl: string | null = null

    // Upload marker file if provided
    if (markerFile) {
      const markerPath = `${user.id}/${Date.now()}-${markerFile.name}`
      const markerBuffer = Uint8Array.from(atob(markerFile.base64), c => c.charCodeAt(0))
      
      const { data: markerData, error: markerError } = await supabaseClient.storage
        .from('ar-markers')
        .upload(markerPath, markerBuffer, {
          contentType: markerFile.type,
          upsert: false,
        })

      if (markerError) {
        throw new Error(`Failed to upload marker: ${markerError.message}`)
      }

      // Get public URL
      const { data: urlData } = supabaseClient.storage
        .from('ar-markers')
        .getPublicUrl(markerPath)
      
      markerUrl = urlData.publicUrl
    }

    // Upload model file if provided
    if (modelFile) {
      const modelPath = `${user.id}/${Date.now()}-${modelFile.name}`
      const modelBuffer = Uint8Array.from(atob(modelFile.base64), c => c.charCodeAt(0))
      
      const { data: modelData, error: modelError } = await supabaseClient.storage
        .from('ar-models')
        .upload(modelPath, modelBuffer, {
          contentType: modelFile.type,
          upsert: false,
        })

      if (modelError) {
        throw new Error(`Failed to upload model: ${modelError.message}`)
      }

      // Get public URL
      const { data: urlData } = supabaseClient.storage
        .from('ar-models')
        .getPublicUrl(modelPath)
      
      modelUrl = urlData.publicUrl
    }

    // Create AR content record
    const { data: arContent, error: dbError } = await supabaseClient
      .from('ar_contents')
      .insert({
        user_id: user.id,
        title,
        description,
        marker_url: markerUrl,
        model_url: modelUrl,
        is_public: isPublic,
      })
      .select()
      .single()

    if (dbError) {
      throw new Error(`Failed to create AR content: ${dbError.message}`)
    }

    // If marker was uploaded, create marker record
    if (markerUrl && arContent) {
      const { error: markerRecordError } = await supabaseClient
        .from('ar_markers')
        .insert({
          content_id: arContent.id,
          marker_image_url: markerUrl,
          marker_pattern_url: markerUrl, // This would be the processed .mind file URL
        })

      if (markerRecordError) {
        console.error('Failed to create marker record:', markerRecordError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: arContent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in upload-ar-content function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})