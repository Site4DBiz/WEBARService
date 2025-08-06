import { createClient } from '@/lib/supabase/server'
import { BatchJob, BatchJobType, JobStatus, ScheduleType } from '@/types/batch'
import { processMarkerOptimization } from './processors/marker-optimization'
import { processMindARGeneration } from './processors/mindar-generation'
import { processContentUpdate } from './processors/content-update'
import { processDataExport } from './processors/data-export'
import { processStatisticsAggregation } from './processors/statistics-aggregation'

export class JobScheduler {
  private processingJobs: Set<string> = new Set()
  private maxConcurrentJobs = 3

  async scheduleJob(jobData: Partial<BatchJob>): Promise<string> {
    const supabase = createClient()

    const { data: job, error } = await supabase
      .from('batch_jobs')
      .insert({
        ...jobData,
        status: jobData.schedule_type === 'immediate' ? 'queued' : 'pending',
      })
      .select()
      .single()

    if (error) throw error

    if (jobData.schedule_type === 'immediate') {
      await this.processNextJob()
    }

    return job.id
  }

  async processNextJob(): Promise<void> {
    if (this.processingJobs.size >= this.maxConcurrentJobs) {
      return
    }

    const supabase = createClient()

    // Get next job from queue
    const { data: nextJob, error } = await supabase
      .from('batch_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('created_at')
      .limit(1)
      .single()

    if (error || !nextJob) return

    this.processingJobs.add(nextJob.id)

    try {
      await this.executeJob(nextJob)
    } finally {
      this.processingJobs.delete(nextJob.id)
      // Process next job in queue
      setImmediate(() => this.processNextJob())
    }
  }

  private async executeJob(job: BatchJob): Promise<void> {
    const supabase = createClient()

    try {
      // Update job status to processing
      await supabase
        .from('batch_jobs')
        .update({ status: 'processing' as JobStatus })
        .eq('id', job.id)

      // Execute based on job type
      let result
      switch (job.type) {
        case 'marker_optimization':
          result = await processMarkerOptimization(job)
          break
        case 'mindar_generation':
          result = await processMindARGeneration(job)
          break
        case 'content_update':
          result = await processContentUpdate(job)
          break
        case 'data_export':
          result = await processDataExport(job)
          break
        case 'statistics_aggregation':
          result = await processStatisticsAggregation(job)
          break
        default:
          throw new Error(`Unknown job type: ${job.type}`)
      }

      // Update job status to completed
      await supabase
        .from('batch_jobs')
        .update({
          status: 'completed' as JobStatus,
          processed_items: result.processed,
          failed_items: result.failed,
        })
        .eq('id', job.id)

      // Record history
      await supabase.from('batch_job_history').insert({
        job_id: job.id,
        status: 'completed',
        started_at: job.started_at,
        completed_at: new Date().toISOString(),
        total_items: result.total,
        processed_items: result.processed,
        failed_items: result.failed,
        result_summary: result.summary,
      })
    } catch (error) {
      // Update job status to failed
      await supabase
        .from('batch_jobs')
        .update({
          status: 'failed' as JobStatus,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', job.id)

      // Record failure in history
      await supabase.from('batch_job_history').insert({
        job_id: job.id,
        status: 'failed',
        started_at: job.started_at,
        completed_at: new Date().toISOString(),
        error_logs: [
          {
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          },
        ],
      })
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    const supabase = createClient()

    await supabase
      .from('batch_jobs')
      .update({ status: 'cancelled' as JobStatus })
      .eq('id', jobId)
  }

  async getJobProgress(jobId: string): Promise<number> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('batch_jobs')
      .select('progress')
      .eq('id', jobId)
      .single()

    if (error) throw error
    return data?.progress || 0
  }

  async getScheduledJobs(): Promise<BatchJob[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('batch_jobs')
      .select('*')
      .in('status', ['pending', 'queued'])
      .order('priority', { ascending: false })
      .order('created_at')

    if (error) throw error
    return data || []
  }

  async getActiveJobs(): Promise<BatchJob[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('batch_jobs')
      .select('*')
      .eq('status', 'processing')
      .order('started_at')

    if (error) throw error
    return data || []
  }

  async processScheduledJobs(): Promise<void> {
    const supabase = createClient()
    const now = new Date().toISOString()

    // Find scheduled jobs that are due
    const { data: dueJobs, error } = await supabase
      .from('batch_jobs')
      .select('*')
      .eq('status', 'pending')
      .eq('schedule_type', 'scheduled')
      .lte('scheduled_at', now)

    if (error || !dueJobs) return

    // Queue due jobs
    for (const job of dueJobs) {
      await supabase
        .from('batch_jobs')
        .update({ status: 'queued' as JobStatus })
        .eq('id', job.id)
    }

    // Process queued jobs
    await this.processNextJob()
  }

  // Run this periodically (e.g., every minute) to process scheduled jobs
  startScheduler(): void {
    setInterval(() => {
      this.processScheduledJobs()
    }, 60000) // Check every minute
  }
}

// Singleton instance
export const jobScheduler = new JobScheduler()
