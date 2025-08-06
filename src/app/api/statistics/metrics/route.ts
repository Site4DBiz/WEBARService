import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// システムメトリクスの記録
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { metrics } = body

    if (!metrics || !Array.isArray(metrics)) {
      return NextResponse.json({ error: 'Invalid metrics data' }, { status: 400 })
    }

    // メトリクスデータの検証と変換
    const validMetrics = metrics.map((metric) => ({
      metric_type: metric.type,
      metric_value: metric.value,
      metadata: metric.metadata || {},
    }))

    // バッチ挿入
    const { data, error } = await supabase.from('system_metrics').insert(validMetrics).select()

    if (error) throw error
    return NextResponse.json({ success: true, count: data.length })
  } catch (error) {
    console.error('Metrics POST error:', error)
    return NextResponse.json({ error: 'Failed to record metrics' }, { status: 500 })
  }
}

// システムメトリクスの取得
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams
  const metricType = searchParams.get('type')
  const hours = parseInt(searchParams.get('hours') || '24')

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 管理者のみアクセス可能
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // メトリクスクエリの構築
    let query = supabase
      .from('system_metrics')
      .select('*')
      .gte('recorded_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())

    if (metricType) {
      query = query.eq('metric_type', metricType)
    }

    const { data: metrics, error } = await query
      .order('recorded_at', { ascending: false })
      .limit(1000)

    if (error) throw error

    // メトリクスタイプ別に集計
    const aggregated = metrics.reduce((acc: any, metric) => {
      if (!acc[metric.metric_type]) {
        acc[metric.metric_type] = {
          type: metric.metric_type,
          values: [],
          latest: metric.metric_value,
          average: 0,
          min: metric.metric_value,
          max: metric.metric_value,
        }
      }

      const group = acc[metric.metric_type]
      group.values.push({
        value: metric.metric_value,
        time: metric.recorded_at,
        metadata: metric.metadata,
      })

      group.min = Math.min(group.min, metric.metric_value)
      group.max = Math.max(group.max, metric.metric_value)

      return acc
    }, {})

    // 平均値を計算
    Object.values(aggregated).forEach((group: any) => {
      const sum = group.values.reduce((s: number, v: any) => s + v.value, 0)
      group.average = sum / group.values.length
    })

    return NextResponse.json({
      metrics: Object.values(aggregated),
      period: { hours, from: new Date(Date.now() - hours * 60 * 60 * 1000), to: new Date() },
    })
  } catch (error) {
    console.error('Metrics GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}
