import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const filter = searchParams.get('filter') || 'all'
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 現在のユーザーを取得
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let query = supabase.from('ar_markers').select('*', { count: 'exact' })

    // フィルター適用
    if (filter === 'my' && user) {
      query = query.eq('user_id', user.id)
    } else if (filter === 'public') {
      query = query.eq('is_public', true)
    } else if (filter === 'favorites' && user) {
      // お気に入りマーカーを取得
      const { data: favorites } = await supabase
        .from('ar_marker_favorites')
        .select('marker_id')
        .eq('user_id', user.id)

      if (favorites && favorites.length > 0) {
        const markerIds = favorites.map((f) => f.marker_id)
        query = query.in('id', markerIds)
      } else {
        return NextResponse.json({
          markers: [],
          total: 0,
          limit,
          offset,
        })
      }
    } else {
      // 'all'の場合: 自分のマーカーまたは公開マーカー
      if (user) {
        query = query.or(`user_id.eq.${user.id},is_public.eq.true`)
      } else {
        query = query.eq('is_public', true)
      }
    }

    // カテゴリーフィルター
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // 検索
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // ソートとページネーション
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data: markers, error, count } = await query

    if (error) {
      throw error
    }

    // ユーザー情報を追加
    if (markers && markers.length > 0) {
      const userIds = [...new Set(markers.map((m) => m.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds)

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

      const markersWithUser = markers.map((marker) => ({
        ...marker,
        user: profileMap.get(marker.user_id) || null,
      }))

      return NextResponse.json({
        markers: markersWithUser,
        total: count || 0,
        limit,
        offset,
      })
    }

    return NextResponse.json({
      markers: markers || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('マーカー取得エラー:', error)
    return NextResponse.json({ error: 'マーカーの取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()

    // 必須フィールドの検証
    if (!body.name || !body.marker_image_url) {
      return NextResponse.json({ error: 'マーカー名と画像URLは必須です' }, { status: 400 })
    }

    // マーカー情報を保存
    const { data, error } = await supabase
      .from('ar_markers')
      .insert({
        user_id: user.id,
        name: body.name,
        description: body.description || null,
        category: body.category || 'general',
        tags: body.tags || [],
        is_public: body.is_public || false,
        marker_image_url: body.marker_image_url,
        marker_pattern_url: body.marker_pattern_url || null,
        width: body.width || 1.0,
        height: body.height || 1.0,
        quality_score: body.quality_score || 0,
        metadata: body.metadata || {},
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      marker: data,
    })
  } catch (error: any) {
    console.error('マーカー作成エラー:', error)
    return NextResponse.json({ error: 'マーカーの作成に失敗しました' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'マーカーIDが必要です' }, { status: 400 })
    }

    // 所有権の確認
    const { data: existingMarker } = await supabase
      .from('ar_markers')
      .select('user_id')
      .eq('id', body.id)
      .single()

    if (!existingMarker || existingMarker.user_id !== user.id) {
      return NextResponse.json({ error: 'このマーカーを編集する権限がありません' }, { status: 403 })
    }

    // マーカー情報を更新
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.is_public !== undefined) updateData.is_public = body.is_public
    if (body.width !== undefined) updateData.width = body.width
    if (body.height !== undefined) updateData.height = body.height
    if (body.marker_image_url !== undefined) updateData.marker_image_url = body.marker_image_url
    if (body.marker_pattern_url !== undefined)
      updateData.marker_pattern_url = body.marker_pattern_url
    if (body.quality_score !== undefined) updateData.quality_score = body.quality_score
    if (body.metadata !== undefined) updateData.metadata = body.metadata

    const { data, error } = await supabase
      .from('ar_markers')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      marker: data,
    })
  } catch (error: any) {
    console.error('マーカー更新エラー:', error)
    return NextResponse.json({ error: 'マーカーの更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const markerId = searchParams.get('id')

    if (!markerId) {
      return NextResponse.json({ error: 'マーカーIDが必要です' }, { status: 400 })
    }

    // 所有権の確認
    const { data: existingMarker } = await supabase
      .from('ar_markers')
      .select('user_id')
      .eq('id', markerId)
      .single()

    if (!existingMarker || existingMarker.user_id !== user.id) {
      return NextResponse.json({ error: 'このマーカーを削除する権限がありません' }, { status: 403 })
    }

    // マーカーを削除
    const { error } = await supabase.from('ar_markers').delete().eq('id', markerId)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'マーカーが削除されました',
    })
  } catch (error: any) {
    console.error('マーカー削除エラー:', error)
    return NextResponse.json({ error: 'マーカーの削除に失敗しました' }, { status: 500 })
  }
}
