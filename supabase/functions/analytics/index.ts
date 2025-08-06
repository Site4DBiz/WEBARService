import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyticsRequest {
  action: 'get_content_stats' | 'get_user_stats' | 'get_time_series' | 'get_performance_metrics'
  contentId?: string
  userId?: string
  dateRange?: {
    start: string
    end: string
  }
  interval?: 'day' | 'week' | 'month'
}

interface ContentStats {
  contentId: string
  totalViews: number
  uniqueUsers: number
  avgSessionDuration: number
  deviceBreakdown: {
    mobile: number
    desktop: number
    tablet: number
  }
  locationBreakdown: Record<string, number>
}

interface UserStats {
  userId: string
  totalSessions: number
  totalDuration: number
  contentViewed: number
  lastActive: string
}

interface TimeSeriesData {
  date: string
  views: number
  users: number
  sessions: number
}

interface PerformanceMetrics {
  detectionSuccessRate: number
  avgDetectionTime: number
  avgSessionDuration: number
  engagementRate: number
  bounceRate: number
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: AnalyticsRequest = await req.json()
    let response: any = {}

    switch (body.action) {
      case 'get_content_stats':
        response = await getContentStats(supabase, body.contentId, body.dateRange)
        break

      case 'get_user_stats':
        response = await getUserStats(supabase, body.userId || user.id, body.dateRange)
        break

      case 'get_time_series':
        response = await getTimeSeriesData(
          supabase,
          body.contentId,
          body.dateRange,
          body.interval || 'day'
        )
        break

      case 'get_performance_metrics':
        response = await getPerformanceMetrics(supabase, body.contentId, body.dateRange)
        break

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Analytics function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function getContentStats(
  supabase: any,
  contentId?: string,
  dateRange?: { start: string; end: string }
): Promise<ContentStats[]> {
  let query = supabase
    .from('ar_sessions')
    .select('*')

  if (contentId) {
    query = query.eq('content_id', contentId)
  }

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
  }

  const { data: sessions, error } = await query

  if (error) throw error

  // Aggregate data by content
  const contentMap = new Map<string, ContentStats>()

  for (const session of sessions) {
    const contentId = session.content_id
    if (!contentMap.has(contentId)) {
      contentMap.set(contentId, {
        contentId,
        totalViews: 0,
        uniqueUsers: new Set(),
        avgSessionDuration: 0,
        deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 },
        locationBreakdown: {},
      } as any)
    }

    const stats = contentMap.get(contentId)!
    stats.totalViews++
    ;(stats as any).uniqueUsers.add(session.user_id)

    // Device breakdown
    const device = detectDevice(session.user_agent || '')
    stats.deviceBreakdown[device]++

    // Location breakdown
    if (session.location) {
      stats.locationBreakdown[session.location] = 
        (stats.locationBreakdown[session.location] || 0) + 1
    }

    // Duration
    if (session.duration) {
      stats.avgSessionDuration += session.duration
    }
  }

  // Convert to array and calculate averages
  return Array.from(contentMap.values()).map(stats => ({
    ...stats,
    uniqueUsers: (stats as any).uniqueUsers.size,
    avgSessionDuration: stats.totalViews > 0 
      ? Math.round(stats.avgSessionDuration / stats.totalViews)
      : 0,
  }))
}

async function getUserStats(
  supabase: any,
  userId: string,
  dateRange?: { start: string; end: string }
): Promise<UserStats> {
  let query = supabase
    .from('ar_sessions')
    .select('*')
    .eq('user_id', userId)

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
  }

  const { data: sessions, error } = await query

  if (error) throw error

  const uniqueContent = new Set()
  let totalDuration = 0
  let lastActive = null

  for (const session of sessions) {
    uniqueContent.add(session.content_id)
    if (session.duration) {
      totalDuration += session.duration
    }
    if (!lastActive || new Date(session.created_at) > new Date(lastActive)) {
      lastActive = session.created_at
    }
  }

  return {
    userId,
    totalSessions: sessions.length,
    totalDuration,
    contentViewed: uniqueContent.size,
    lastActive: lastActive || new Date().toISOString(),
  }
}

async function getTimeSeriesData(
  supabase: any,
  contentId?: string,
  dateRange?: { start: string; end: string },
  interval: 'day' | 'week' | 'month' = 'day'
): Promise<TimeSeriesData[]> {
  let query = supabase
    .from('ar_sessions')
    .select('created_at, user_id')

  if (contentId) {
    query = query.eq('content_id', contentId)
  }

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
  }

  const { data: sessions, error } = await query

  if (error) throw error

  // Group by interval
  const timeMap = new Map<string, { views: number; users: Set<string>; sessions: number }>()

  for (const session of sessions) {
    const date = formatDate(new Date(session.created_at), interval)
    
    if (!timeMap.has(date)) {
      timeMap.set(date, {
        views: 0,
        users: new Set(),
        sessions: 0,
      })
    }

    const stats = timeMap.get(date)!
    stats.views++
    stats.users.add(session.user_id)
    stats.sessions++
  }

  // Convert to array
  return Array.from(timeMap.entries())
    .map(([date, stats]) => ({
      date,
      views: stats.views,
      users: stats.users.size,
      sessions: stats.sessions,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

async function getPerformanceMetrics(
  supabase: any,
  contentId?: string,
  dateRange?: { start: string; end: string }
): Promise<PerformanceMetrics> {
  let query = supabase
    .from('ar_sessions')
    .select('*')

  if (contentId) {
    query = query.eq('content_id', contentId)
  }

  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
  }

  const { data: sessions, error } = await query

  if (error) throw error

  let totalSessions = sessions.length
  let successfulDetections = 0
  let totalDetectionTime = 0
  let totalDuration = 0
  let engagedSessions = 0
  let bouncedSessions = 0

  for (const session of sessions) {
    if (session.detection_success) {
      successfulDetections++
    }
    if (session.detection_time) {
      totalDetectionTime += session.detection_time
    }
    if (session.duration) {
      totalDuration += session.duration
      
      // Consider engaged if session > 30 seconds
      if (session.duration > 30) {
        engagedSessions++
      }
      
      // Consider bounced if session < 10 seconds
      if (session.duration < 10) {
        bouncedSessions++
      }
    }
  }

  return {
    detectionSuccessRate: totalSessions > 0 
      ? (successfulDetections / totalSessions) * 100 
      : 0,
    avgDetectionTime: successfulDetections > 0 
      ? totalDetectionTime / successfulDetections 
      : 0,
    avgSessionDuration: totalSessions > 0 
      ? totalDuration / totalSessions 
      : 0,
    engagementRate: totalSessions > 0 
      ? (engagedSessions / totalSessions) * 100 
      : 0,
    bounceRate: totalSessions > 0 
      ? (bouncedSessions / totalSessions) * 100 
      : 0,
  }
}

function detectDevice(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent.toLowerCase()
  
  if (/ipad|android.*tablet|tablet.*android/i.test(ua)) {
    return 'tablet'
  }
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

function formatDate(date: Date, interval: 'day' | 'week' | 'month'): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  switch (interval) {
    case 'day':
      return `${year}-${month}-${day}`
    case 'week':
      const weekNumber = getWeekNumber(date)
      return `${year}-W${String(weekNumber).padStart(2, '0')}`
    case 'month':
      return `${year}-${month}`
    default:
      return `${year}-${month}-${day}`
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}