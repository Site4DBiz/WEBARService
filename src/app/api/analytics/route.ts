import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'day'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const contentId = searchParams.get('contentId')
    const userId = searchParams.get('userId')

    // 現在の日付から期間を計算
    const now = new Date()
    let dateFrom = new Date()

    switch (period) {
      case 'day':
        dateFrom.setDate(now.getDate() - 1)
        break
      case 'week':
        dateFrom.setDate(now.getDate() - 7)
        break
      case 'month':
        dateFrom.setMonth(now.getMonth() - 1)
        break
      case 'year':
        dateFrom.setFullYear(now.getFullYear() - 1)
        break
      case 'custom':
        if (startDate) dateFrom = new Date(startDate)
        break
    }

    const dateTo = endDate ? new Date(endDate) : now

    // 基本統計の取得
    const [userStats, contentStats, sessionStats, viewStats, deviceStats, locationStats] =
      await Promise.all([
        // ユーザー統計
        getUserStats(supabase, dateFrom, dateTo),
        // コンテンツ統計
        getContentStats(supabase, dateFrom, dateTo, contentId),
        // セッション統計
        getSessionStats(supabase, dateFrom, dateTo),
        // ビュー統計
        getViewStats(supabase, dateFrom, dateTo),
        // デバイス統計
        getDeviceStats(supabase, dateFrom, dateTo),
        // 地域統計
        getLocationStats(supabase, dateFrom, dateTo),
      ])

    // 時系列データの取得
    const timeSeriesData = await getTimeSeriesData(supabase, dateFrom, dateTo, period)

    // トップパフォーマンスデータ
    const topPerformers = await getTopPerformers(supabase, dateFrom, dateTo)

    return NextResponse.json({
      period,
      dateRange: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
      overview: {
        users: userStats,
        contents: contentStats,
        sessions: sessionStats,
        views: viewStats,
      },
      demographics: {
        devices: deviceStats,
        locations: locationStats,
      },
      timeSeries: timeSeriesData,
      topPerformers,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Analytics API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 })
  }
}

async function getUserStats(supabase: any, dateFrom: Date, dateTo: Date) {
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { count: newUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString())

  const { count: activeUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('updated_at', dateFrom.toISOString())

  // ロール別統計
  const { data: roleStats } = await supabase
    .from('profiles')
    .select('role')
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString())

  const roleDistribution = roleStats?.reduce((acc: any, user: any) => {
    acc[user.role] = (acc[user.role] || 0) + 1
    return acc
  }, {})

  return {
    total: totalUsers || 0,
    new: newUsers || 0,
    active: activeUsers || 0,
    roleDistribution: roleDistribution || {},
    growthRate: totalUsers > 0 ? (((newUsers || 0) / totalUsers) * 100).toFixed(2) : 0,
  }
}

async function getContentStats(
  supabase: any,
  dateFrom: Date,
  dateTo: Date,
  contentId?: string | null
) {
  let query = supabase.from('ar_contents').select('*', { count: 'exact' })

  if (contentId) {
    query = query.eq('id', contentId)
  }

  const { count: totalContents } = await query

  const { count: newContents } = await supabase
    .from('ar_contents')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString())

  const { data: statusStats } = await supabase.from('ar_contents').select('status')

  const statusDistribution = statusStats?.reduce((acc: any, content: any) => {
    acc[content.status] = (acc[content.status] || 0) + 1
    return acc
  }, {})

  // カテゴリ別統計
  const { data: categoryStats } = await supabase.from('ar_contents').select('category')

  const categoryDistribution = categoryStats?.reduce((acc: any, content: any) => {
    const cat = content.category || 'uncategorized'
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {})

  return {
    total: totalContents || 0,
    new: newContents || 0,
    statusDistribution: statusDistribution || {},
    categoryDistribution: categoryDistribution || {},
    averagePerUser: 0, // これは後で計算
  }
}

async function getSessionStats(supabase: any, dateFrom: Date, dateTo: Date) {
  // アクセスログテーブルから集計
  const { data: sessions, count } = await supabase
    .from('access_logs')
    .select('*', { count: 'exact' })
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString())

  if (!sessions || sessions.length === 0) {
    return {
      total: 0,
      average: 0,
      bounceRate: 0,
      averageDuration: 0,
    }
  }

  // セッション時間の計算（ダミーデータ）
  const averageDuration = 245 // 秒
  const bounceRate = 35.5 // パーセント

  return {
    total: count || 0,
    average: Math.floor(
      (count || 0) /
        Math.max(1, Math.floor((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)))
    ),
    bounceRate,
    averageDuration,
  }
}

async function getViewStats(supabase: any, dateFrom: Date, dateTo: Date) {
  const { count: totalViews } = await supabase
    .from('access_logs')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'view')
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString())

  const { count: uniqueViews } = await supabase
    .from('access_logs')
    .select('user_id', { count: 'exact', head: true })
    .eq('action', 'view')
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString())

  // 人気コンテンツの取得
  const { data: popularContent } = await supabase
    .from('access_logs')
    .select('metadata')
    .eq('action', 'view')
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString())
    .limit(100)

  return {
    total: totalViews || 0,
    unique: uniqueViews || 0,
    averagePerSession: totalViews && uniqueViews ? (totalViews / uniqueViews).toFixed(2) : 0,
    popularContentIds: [], // 後で実装
  }
}

async function getDeviceStats(supabase: any, dateFrom: Date, dateTo: Date) {
  const { data: logs } = await supabase
    .from('access_logs')
    .select('metadata')
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString())

  // メタデータからデバイス情報を抽出（ダミーデータ）
  const deviceDistribution = {
    mobile: 45,
    desktop: 40,
    tablet: 15,
  }

  const browserDistribution = {
    chrome: 55,
    safari: 25,
    firefox: 15,
    edge: 5,
  }

  const osDistribution = {
    windows: 35,
    macos: 25,
    ios: 20,
    android: 18,
    linux: 2,
  }

  return {
    devices: deviceDistribution,
    browsers: browserDistribution,
    os: osDistribution,
  }
}

async function getLocationStats(supabase: any, dateFrom: Date, dateTo: Date) {
  // 地域統計（ダミーデータ）
  const countryDistribution = {
    Japan: 45,
    'United States': 25,
    'United Kingdom': 10,
    Germany: 8,
    France: 7,
    Others: 5,
  }

  const cityDistribution = {
    Tokyo: 30,
    Osaka: 15,
    'New York': 10,
    London: 8,
    Berlin: 5,
    Others: 32,
  }

  return {
    countries: countryDistribution,
    cities: cityDistribution,
    topRegions: Object.entries(countryDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, percentage]) => ({ country, percentage })),
  }
}

async function getTimeSeriesData(supabase: any, dateFrom: Date, dateTo: Date, period: string) {
  // 期間に応じたグループ化
  const days = Math.floor((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24))
  const dataPoints = []

  for (let i = 0; i <= Math.min(days, 30); i++) {
    const date = new Date(dateFrom)
    date.setDate(dateFrom.getDate() + i)

    dataPoints.push({
      date: date.toISOString().split('T')[0],
      users: Math.floor(Math.random() * 100) + 50,
      views: Math.floor(Math.random() * 500) + 200,
      sessions: Math.floor(Math.random() * 200) + 100,
      contents: Math.floor(Math.random() * 20) + 5,
    })
  }

  return dataPoints
}

async function getTopPerformers(supabase: any, dateFrom: Date, dateTo: Date) {
  // トップコンテンツ
  const { data: topContents } = await supabase
    .from('ar_contents')
    .select('id, title, views_count, created_at')
    .order('views_count', { ascending: false })
    .limit(5)

  // トップクリエイター
  const { data: topCreators } = await supabase
    .from('profiles')
    .select('id, username, email')
    .eq('role', 'creator')
    .limit(5)

  // エンゲージメント率の高いコンテンツ（ダミーデータ）
  const engagementData = topContents?.map((content: any) => ({
    ...content,
    engagementRate: (Math.random() * 20 + 5).toFixed(2),
  }))

  return {
    contents: topContents || [],
    creators: topCreators || [],
    engagement: engagementData || [],
  }
}
