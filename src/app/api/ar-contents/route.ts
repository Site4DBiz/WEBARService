import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    // パラメータ取得
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const category = searchParams.get('category') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // ユーザー確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // クエリ構築
    let query = supabase.from('ar_contents').select(
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
      `,
      { count: 'exact' }
    )

    // フィルタ条件適用
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // ソート
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // ページネーション
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching AR contents:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // カテゴリ一覧取得
    const { data: categories } = await supabase
      .from('ar_contents')
      .select('category')
      .not('category', 'is', null)
      .order('category')

    const uniqueCategories = [...new Set(categories?.map((c) => c.category) || [])]

    return NextResponse.json({
      contents: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      categories: uniqueCategories,
    })
  } catch (error) {
    console.error('Error in AR contents API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const ids = searchParams.get('ids')?.split(',') || []

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
    }

    // ユーザー確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 削除実行（ソフトデリート）
    const { error } = await supabase
      .from('ar_contents')
      .update({ status: 'deleted' })
      .in('id', ids)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting AR contents:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete AR contents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const { ids, status } = body

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
    }

    if (!status) {
      return NextResponse.json({ error: 'No status provided' }, { status: 400 })
    }

    // ユーザー確認
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ステータス更新
    const updateData: any = { status }
    if (status === 'published') {
      updateData.published_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('ar_contents')
      .update(updateData)
      .in('id', ids)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating AR contents:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in update AR contents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
