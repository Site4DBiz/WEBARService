import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { searchParams } = new URL(request.url)
  const markerId = searchParams.get('marker_id')

  if (!markerId) {
    return NextResponse.json({ error: 'Marker ID is required' }, { status: 400 })
  }

  try {
    // バージョン履歴を取得
    const { data: versions, error: versionsError } = await supabase
      .from('ar_marker_versions')
      .select(
        `
        *,
        created_by_profile:profiles!ar_marker_versions_created_by_fkey(
          username,
          full_name
        )
      `
      )
      .eq('marker_id', markerId)
      .order('version_number', { ascending: false })

    if (versionsError) {
      throw versionsError
    }

    return NextResponse.json({ versions })
  } catch (error) {
    console.error('Error fetching marker versions:', error)
    return NextResponse.json({ error: 'Failed to fetch marker versions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const {
      marker_id,
      image_url,
      thumbnail_url,
      quality_score,
      change_description,
      file_size,
      width,
      height,
      mime_type,
    } = body

    // ユーザー認証の確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // マーカーの所有権確認
    const { data: marker, error: markerError } = await supabase
      .from('ar_markers')
      .select('user_id')
      .eq('id', marker_id)
      .single()

    if (markerError || !marker) {
      return NextResponse.json({ error: 'Marker not found' }, { status: 404 })
    }

    if (marker.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this marker' },
        { status: 403 }
      )
    }

    // 新しいバージョンを作成
    const { data: newVersion, error: versionError } = await supabase
      .from('ar_marker_versions')
      .insert({
        marker_id,
        image_url,
        thumbnail_url,
        quality_score,
        change_description,
        file_size,
        width,
        height,
        mime_type,
        is_current: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (versionError) {
      throw versionError
    }

    return NextResponse.json({ version: newVersion }, { status: 201 })
  } catch (error) {
    console.error('Error creating marker version:', error)
    return NextResponse.json({ error: 'Failed to create marker version' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { version_id, is_current } = body

    // ユーザー認証の確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // バージョンとマーカーの情報を取得
    const { data: version, error: versionError } = await supabase
      .from('ar_marker_versions')
      .select(
        `
        *,
        marker:ar_markers!inner(user_id)
      `
      )
      .eq('id', version_id)
      .single()

    if (versionError || !version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // 所有権の確認
    if (version.marker.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this version' },
        { status: 403 }
      )
    }

    // バージョンを現在のバージョンに設定
    if (is_current) {
      const { error: updateError } = await supabase
        .from('ar_marker_versions')
        .update({ is_current: true })
        .eq('id', version_id)

      if (updateError) {
        throw updateError
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating marker version:', error)
    return NextResponse.json({ error: 'Failed to update marker version' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const { searchParams } = new URL(request.url)
  const versionId = searchParams.get('version_id')

  if (!versionId) {
    return NextResponse.json({ error: 'Version ID is required' }, { status: 400 })
  }

  try {
    // ユーザー認証の確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // バージョンとマーカーの情報を取得
    const { data: version, error: versionError } = await supabase
      .from('ar_marker_versions')
      .select(
        `
        *,
        marker:ar_markers!inner(user_id)
      `
      )
      .eq('id', versionId)
      .single()

    if (versionError || !version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // 所有権の確認
    if (version.marker.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this version' },
        { status: 403 }
      )
    }

    // 現在のバージョンは削除できない
    if (version.is_current) {
      return NextResponse.json({ error: 'Cannot delete the current version' }, { status: 400 })
    }

    // バージョンを削除
    const { error: deleteError } = await supabase
      .from('ar_marker_versions')
      .delete()
      .eq('id', versionId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting marker version:', error)
    return NextResponse.json({ error: 'Failed to delete marker version' }, { status: 500 })
  }
}
