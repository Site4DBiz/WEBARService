import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jobScheduler } from '@/lib/batch/job-scheduler'
import { BatchJobType, ScheduleType } from '@/types/batch'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('batch_jobs')
      .select('*, profiles!batch_jobs_created_by_fkey(username, full_name)', { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    }
    if (type) {
      query = query.eq('type', type)
    }

    const {
      data: jobs,
      error,
      count,
    } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      jobs,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching batch jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch batch jobs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    // Validate user permissions
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate job data
    const {
      name,
      type,
      schedule_type = 'immediate',
      scheduled_at,
      cron_expression,
      config = {},
      priority = 5,
    } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    // Validate job type
    const validTypes: BatchJobType[] = [
      'marker_optimization',
      'mindar_generation',
      'content_update',
      'data_export',
      'statistics_aggregation',
    ]

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid job type' }, { status: 400 })
    }

    // Schedule the job
    const jobId = await jobScheduler.scheduleJob({
      name,
      type,
      schedule_type: schedule_type as ScheduleType,
      scheduled_at,
      cron_expression,
      config,
      priority,
      created_by: user.id,
    })

    // Fetch the created job
    const { data: job } = await supabase.from('batch_jobs').select('*').eq('id', jobId).single()

    return NextResponse.json({ job })
  } catch (error) {
    console.error('Error creating batch job:', error)
    return NextResponse.json({ error: 'Failed to create batch job' }, { status: 500 })
  }
}
