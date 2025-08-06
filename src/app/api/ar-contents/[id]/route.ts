import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET: 個別のARコンテンツを取得
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { id } = params

    // ユーザー確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ARコンテンツ取得
    const { data, error } = await supabase
      .from('ar_contents')
      .select(
        `
        *,
        profiles!ar_contents_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        ),
        ar_markers!ar_markers_content_id_fkey (
          id,
          marker_type,
          marker_image_url,
          is_active
        )
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Content not found' }, { status: 404 })
      }
      console.error('Error fetching AR content:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in AR content GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: ARコンテンツを更新
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { id } = params
    const body = await request.json()

    // ユーザー確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 既存のコンテンツの所有者確認
    const { data: existingContent, error: fetchError } = await supabase
      .from('ar_contents')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Content not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // 所有者でない場合はエラー
    if (existingContent.user_id !== user.id) {
      // 管理者チェック
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // 更新データの準備
    const updateData = {
      title: body.title,
      description: body.description,
      category: body.category,
      status: body.status,
      thumbnail_url: body.thumbnail_url,
      model_url: body.model_url,
      marker_image_url: body.marker_image_url,
      scale: body.scale,
      position: body.position,
      rotation: body.rotation,
      animation_settings: body.animation_settings,
      interaction_settings: body.interaction_settings,
      is_public: body.is_public,
      tags: body.tags,
      updated_at: new Date().toISOString(),
    }

    // publishedの場合、published_atを設定
    if (body.status === 'published' && !existingContent.published_at) {
      updateData.published_at = new Date().toISOString()
    }

    // ARコンテンツを更新
    const { data, error } = await supabase
      .from('ar_contents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating AR content:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // マーカー情報も更新（もし存在すれば）
    if (body.marker_image_url) {
      const { error: markerError } = await supabase
        .from('ar_markers')
        .upsert({
          content_id: id,
          marker_type: 'image',
          marker_image_url: body.marker_image_url,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('content_id', id)

      if (markerError) {
        console.error('Error updating AR marker:', markerError)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in AR content PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: ARコンテンツを削除（ソフトデリート）
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const { id } = params

    // ユーザー確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 既存のコンテンツの所有者確認
    const { data: existingContent, error: fetchError } = await supabase
      .from('ar_contents')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Content not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // 所有者でない場合はエラー
    if (existingContent.user_id !== user.id) {
      // 管理者チェック
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // ソフトデリート
    const { error } = await supabase
      .from('ar_contents')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error deleting AR content:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in AR content DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
