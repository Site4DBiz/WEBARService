import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { marker_id } = body

    if (!marker_id) {
      return NextResponse.json({ error: 'Marker ID is required' }, { status: 400 })
    }

    // ユーザー認証の確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // マーカー情報を取得
    const { data: marker, error: markerError } = await supabase
      .from('ar_markers')
      .select('*')
      .eq('id', marker_id)
      .single()

    if (markerError || !marker) {
      return NextResponse.json({ error: 'Marker not found' }, { status: 404 })
    }

    // 所有権の確認（公開マーカーでも所有者のみコンパイル可能）
    if (marker.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to compile this marker' },
        { status: 403 }
      )
    }

    // 注意: 実際の.mindファイル生成はクライアントサイドで行われるため、
    // このAPIは主に権限チェックとメタデータの管理に使用されます

    // マーカーのmetadataを更新して、.mindファイルが生成されたことを記録
    const updatedMetadata = {
      ...marker.metadata,
      mindFileGenerated: true,
      mindFileGeneratedAt: new Date().toISOString(),
      mindFileGeneratedBy: user.id,
    }

    const { error: updateError } = await supabase
      .from('ar_markers')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', marker_id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Marker compilation initiated',
      marker: {
        id: marker.id,
        name: marker.name,
        image_url: marker.marker_image_url,
        width: marker.width,
        height: marker.height,
      },
    })
  } catch (error) {
    console.error('Error in compile API:', error)
    return NextResponse.json({ error: 'Failed to process compilation request' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { searchParams } = new URL(request.url)
  const markerId = searchParams.get('marker_id')

  if (!markerId) {
    return NextResponse.json({ error: 'Marker ID is required' }, { status: 400 })
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

    // マーカー情報を取得
    const { data: marker, error: markerError } = await supabase
      .from('ar_markers')
      .select('*')
      .eq('id', markerId)
      .single()

    if (markerError || !marker) {
      return NextResponse.json({ error: 'Marker not found' }, { status: 404 })
    }

    // 公開マーカーまたは所有者の場合のみアクセス可能
    if (!marker.is_public && marker.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // .mindファイルの生成状態を確認
    const hasMindFile = marker.metadata?.mindFileGenerated || false
    const mindFileGeneratedAt = marker.metadata?.mindFileGeneratedAt || null

    return NextResponse.json({
      hasMindFile,
      mindFileGeneratedAt,
      marker: {
        id: marker.id,
        name: marker.name,
        image_url: marker.marker_image_url,
        width: marker.width,
        height: marker.height,
        quality_score: marker.quality_score,
      },
    })
  } catch (error) {
    console.error('Error fetching compile status:', error)
    return NextResponse.json({ error: 'Failed to fetch compile status' }, { status: 500 })
  }
}
