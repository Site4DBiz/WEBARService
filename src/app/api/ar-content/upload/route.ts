import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const markerFile = formData.get('markerFile') as File | null
    const modelFile = formData.get('modelFile') as File | null
    const isPublic = formData.get('isPublic') === 'true'

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!markerFile && !modelFile) {
      return NextResponse.json(
        { error: 'At least one file (marker or model) is required' },
        { status: 400 }
      )
    }

    let markerUrl: string | null = null
    let modelUrl: string | null = null

    // Upload marker file
    if (markerFile) {
      const markerPath = `${user.id}/${Date.now()}-${markerFile.name}`
      const markerBuffer = Buffer.from(await markerFile.arrayBuffer())

      const { data: markerData, error: markerError } = await supabase.storage
        .from('ar-markers')
        .upload(markerPath, markerBuffer, {
          contentType: markerFile.type,
          upsert: false,
        })

      if (markerError) {
        return NextResponse.json(
          { error: `Failed to upload marker: ${markerError.message}` },
          { status: 500 }
        )
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('ar-markers').getPublicUrl(markerPath)

      markerUrl = publicUrl
    }

    // Upload model file
    if (modelFile) {
      const modelPath = `${user.id}/${Date.now()}-${modelFile.name}`
      const modelBuffer = Buffer.from(await modelFile.arrayBuffer())

      const { data: modelData, error: modelError } = await supabase.storage
        .from('ar-models')
        .upload(modelPath, modelBuffer, {
          contentType: modelFile.type,
          upsert: false,
        })

      if (modelError) {
        return NextResponse.json(
          { error: `Failed to upload model: ${modelError.message}` },
          { status: 500 }
        )
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('ar-models').getPublicUrl(modelPath)

      modelUrl = publicUrl
    }

    // Create AR content record
    const { data: arContent, error: dbError } = await supabase
      .from('user_ar_contents')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        target_file_url: markerUrl,
        model_file_url: modelUrl,
        is_public: isPublic,
        content_type: 'image',
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json(
        { error: `Failed to create AR content: ${dbError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: arContent,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's AR contents
    const { data: arContents, error: dbError } = await supabase
      .from('user_ar_contents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (dbError) {
      return NextResponse.json(
        { error: `Failed to fetch AR contents: ${dbError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: arContents,
    })
  } catch (error: any) {
    console.error('Fetch error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
