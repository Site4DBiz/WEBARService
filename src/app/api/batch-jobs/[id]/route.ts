import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jobScheduler } from '@/lib/batch/job-scheduler'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const jobId = params.id

    // Get job details
    const { data: job, error } = await supabase
      .from('batch_jobs')
      .select(
        `
        *,
        profiles!batch_jobs_created_by_fkey(username, full_name),
        batch_job_history(*)
      `
      )
      .eq('id', jobId)
      .single()

    if (error) throw error

    // Get queue items
    const { data: queueItems } = await supabase
      .from('batch_queue_items')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at')

    return NextResponse.json({
      job,
      queueItems: queueItems || [],
    })
  } catch (error) {
    console.error('Error fetching batch job:', error)
    return NextResponse.json({ error: 'Failed to fetch batch job' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const jobId = params.id
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

    const { action } = body

    switch (action) {
      case 'cancel':
        await jobScheduler.cancelJob(jobId)
        break

      case 'retry':
        // Reset job status to queued for retry
        await supabase
          .from('batch_jobs')
          .update({
            status: 'queued',
            error_message: null,
            processed_items: 0,
            failed_items: 0,
            progress: 0,
          })
          .eq('id', jobId)

        // Reset queue items
        await supabase
          .from('batch_queue_items')
          .update({
            status: 'pending',
            error_message: null,
            retry_count: 0,
          })
          .eq('job_id', jobId)

        // Process the job
        await jobScheduler.processNextJob()
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Return updated job
    const { data: job } = await supabase.from('batch_jobs').select('*').eq('id', jobId).single()

    return NextResponse.json({ job })
  } catch (error) {
    console.error('Error updating batch job:', error)
    return NextResponse.json({ error: 'Failed to update batch job' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const jobId = params.id

    // Validate user permissions
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role (only admins can delete)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete the job (cascade will delete history and queue items)
    const { error } = await supabase.from('batch_jobs').delete().eq('id', jobId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting batch job:', error)
    return NextResponse.json({ error: 'Failed to delete batch job' }, { status: 500 })
  }
}
