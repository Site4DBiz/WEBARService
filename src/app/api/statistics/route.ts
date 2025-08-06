import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type')
  const dateFrom = searchParams.get('from')
  const dateTo = searchParams.get('to')

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーロールを確認
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // 管理者またはモデレーター以外は基本統計のみ
    const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'

    switch (type) {
      case 'dashboard': {
        // ダッシュボードメトリクスを取得
        const { data: metrics, error } = await supabase.rpc('get_dashboard_metrics', {
          date_from:
            dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          date_to: dateTo || new Date().toISOString().split('T')[0],
        })

        if (error) throw error
        return NextResponse.json(metrics)
      }

      case 'realtime': {
        // リアルタイム統計を取得
        const { data: stats, error } = await supabase.rpc('get_realtime_stats')

        if (error) throw error
        return NextResponse.json(stats)
      }

      case 'trends': {
        // トレンド分析を取得
        const daysBack = parseInt(searchParams.get('days') || '30')
        const { data: trends, error } = await supabase.rpc('get_trend_analysis', {
          days_back: daysBack,
        })

        if (error) throw error
        return NextResponse.json(trends)
      }

      case 'categories': {
        // カテゴリー別統計を取得
        const { data: categories, error } = await supabase.rpc('get_category_statistics')

        if (error) throw error
        return NextResponse.json(categories)
      }

      case 'user-activity': {
        // ユーザー活動統計（管理者のみ）
        if (!isAdmin) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { data: activity, error } = await supabase
          .from('user_activity_statistics')
          .select('*')
          .order('total_activities', { ascending: false })
          .limit(100)

        if (error) throw error
        return NextResponse.json(activity)
      }

      case 'content-performance': {
        // コンテンツパフォーマンス統計
        const { data: content, error } = await supabase
          .from('content_statistics')
          .select('*')
          .order('view_count', { ascending: false })
          .limit(50)

        if (error) throw error
        return NextResponse.json(content)
      }

      case 'marker-performance': {
        // マーカーパフォーマンス統計
        const { data: markers, error } = await supabase
          .from('marker_statistics')
          .select('*')
          .order('success_rate', { ascending: false })
          .limit(50)

        if (error) throw error
        return NextResponse.json(markers)
      }

      default:
        return NextResponse.json({ error: 'Invalid statistics type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Statistics API error:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
