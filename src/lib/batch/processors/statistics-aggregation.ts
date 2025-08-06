import { createClient } from '@/lib/supabase/server'
import { BatchJob, JobResult } from '@/types/batch'

export async function processStatisticsAggregation(job: BatchJob): Promise<JobResult> {
  const supabase = createClient()
  const config = job.config

  let processed = 0
  let failed = 0
  const aggregatedStats: any = {}

  try {
    const period = config.period || 'day'
    const metrics = config.metrics || ['all']

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1)
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1)
        break
    }

    // Aggregate user statistics
    if (metrics.includes('all') || metrics.includes('users')) {
      const { data: userStats } = await supabase
        .from('profiles')
        .select('role', { count: 'exact' })
        .gte('created_at', startDate.toISOString())

      const { count: newUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())

      aggregatedStats.users = {
        new_users: newUsers || 0,
        by_role: userStats,
      }
      processed++
    }

    // Aggregate AR content statistics
    if (metrics.includes('all') || metrics.includes('ar_contents')) {
      const { count: newContents } = await supabase
        .from('user_ar_contents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())

      const { data: contentsByType } = await supabase
        .from('user_ar_contents')
        .select('content_type')
        .gte('created_at', startDate.toISOString())

      const typeCount = contentsByType?.reduce((acc: any, item) => {
        acc[item.content_type] = (acc[item.content_type] || 0) + 1
        return acc
      }, {})

      aggregatedStats.ar_contents = {
        new_contents: newContents || 0,
        by_type: typeCount || {},
      }
      processed++
    }

    // Aggregate AR marker statistics
    if (metrics.includes('all') || metrics.includes('ar_markers')) {
      const { count: newMarkers } = await supabase
        .from('ar_markers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())

      const { data: markerStats } = await supabase
        .from('ar_markers')
        .select('quality_score, view_count')
        .gte('created_at', startDate.toISOString())

      const avgQuality =
        markerStats?.reduce((sum, m) => sum + (m.quality_score || 0), 0) /
        (markerStats?.length || 1)
      const totalViews = markerStats?.reduce((sum, m) => sum + (m.view_count || 0), 0)

      aggregatedStats.ar_markers = {
        new_markers: newMarkers || 0,
        avg_quality_score: avgQuality || 0,
        total_views: totalViews || 0,
      }
      processed++
    }

    // Aggregate session statistics
    if (metrics.includes('all') || metrics.includes('sessions')) {
      const { data: sessionStats } = await supabase
        .from('ar_sessions')
        .select('detection_success, avg_detection_time')
        .gte('started_at', startDate.toISOString())

      const successRate =
        sessionStats?.filter((s) => s.detection_success).length / (sessionStats?.length || 1)
      const avgDetectionTime =
        sessionStats?.reduce((sum, s) => sum + (s.avg_detection_time || 0), 0) /
        (sessionStats?.length || 1)

      aggregatedStats.sessions = {
        total_sessions: sessionStats?.length || 0,
        success_rate: successRate || 0,
        avg_detection_time: avgDetectionTime || 0,
      }
      processed++
    }

    // Aggregate batch job statistics
    if (metrics.includes('all') || metrics.includes('batch_jobs')) {
      const { data: jobStats } = await supabase
        .from('batch_jobs')
        .select('status, type')
        .gte('created_at', startDate.toISOString())

      const statusCount = jobStats?.reduce((acc: any, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1
        return acc
      }, {})

      const typeCount = jobStats?.reduce((acc: any, job) => {
        acc[job.type] = (acc[job.type] || 0) + 1
        return acc
      }, {})

      aggregatedStats.batch_jobs = {
        total_jobs: jobStats?.length || 0,
        by_status: statusCount || {},
        by_type: typeCount || {},
      }
      processed++
    }

    // Store aggregated statistics
    const { error: insertError } = await supabase.from('system_metrics').insert({
      metric_type: 'aggregated_statistics',
      metric_value: processed,
      metadata: {
        period,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        statistics: aggregatedStats,
      },
    })

    if (insertError) throw insertError

    // Update job progress
    await supabase
      .from('batch_jobs')
      .update({
        total_items: metrics.length,
        processed_items: processed,
      })
      .eq('id', job.id)

    return {
      total: metrics.length,
      processed,
      failed,
      summary: {
        period,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        aggregated_metrics: Object.keys(aggregatedStats),
        statistics: aggregatedStats,
      },
    }
  } catch (error) {
    throw error
  }
}
