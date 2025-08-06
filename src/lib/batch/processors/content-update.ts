import { createClient } from '@/lib/supabase/server'
import { BatchJob, JobResult } from '@/types/batch'

export async function processContentUpdate(job: BatchJob): Promise<JobResult> {
  const supabase = createClient()
  const config = job.config

  let processed = 0
  let failed = 0
  const errors: any[] = []

  try {
    // Get content to update
    const query = supabase.from('user_ar_contents').select('*')

    // Apply filters
    if (config.content_ids) {
      query.in('id', config.content_ids)
    } else if (config.user_id) {
      query.eq('user_id', config.user_id)
    } else if (config.content_type) {
      query.eq('content_type', config.content_type)
    }

    const { data: contents, error } = await query
    if (error) throw error

    const total = contents?.length || 0

    // Update total items
    await supabase.from('batch_jobs').update({ total_items: total }).eq('id', job.id)

    // Process each content item
    for (const content of contents || []) {
      try {
        // Create queue item
        const { data: queueItem } = await supabase
          .from('batch_queue_items')
          .insert({
            job_id: job.id,
            item_type: 'ar_content',
            item_id: content.id,
            status: 'processing',
          })
          .select()
          .single()

        // Prepare update data
        const updateData: any = {}

        // Apply field updates from config
        if (config.update_fields) {
          for (const field of config.update_fields) {
            if (field.name && field.value !== undefined) {
              updateData[field.name] = field.value
            }
          }
        }

        // Apply bulk operations
        if (config.operation === 'publish') {
          updateData.is_public = true
        } else if (config.operation === 'unpublish') {
          updateData.is_public = false
        } else if (config.operation === 'archive') {
          updateData.metadata = {
            ...content.metadata,
            archived: true,
            archived_at: new Date().toISOString(),
          }
        }

        // Update content
        const { error: updateError } = await supabase
          .from('user_ar_contents')
          .update(updateData)
          .eq('id', content.id)

        if (updateError) throw updateError

        // Update queue item
        await supabase
          .from('batch_queue_items')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            processing_data: { updated_fields: Object.keys(updateData) },
          })
          .eq('id', queueItem?.id)

        processed++

        // Update progress
        await supabase.from('batch_jobs').update({ processed_items: processed }).eq('id', job.id)
      } catch (itemError) {
        failed++
        errors.push({
          content_id: content.id,
          error: itemError instanceof Error ? itemError.message : 'Unknown error',
        })

        // Update queue item as failed
        await supabase
          .from('batch_queue_items')
          .update({
            status: 'failed',
            error_message: itemError instanceof Error ? itemError.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('item_id', content.id)
          .eq('job_id', job.id)
      }
    }

    return {
      total,
      processed,
      failed,
      summary: {
        contents_updated: processed,
        update_config: config,
        errors: errors.slice(0, 10),
      },
    }
  } catch (error) {
    throw error
  }
}
