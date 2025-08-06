import { createClient } from '@/lib/supabase/server'
import { BatchJob, JobResult } from '@/types/batch'
import { compileOptimizedMindAR } from '@/lib/utils/optimized-mindar-compiler'

export async function processMindARGeneration(job: BatchJob): Promise<JobResult> {
  const supabase = createClient()
  const config = job.config

  let processed = 0
  let failed = 0
  const errors: any[] = []

  try {
    // Get markers to process
    const query = supabase.from('ar_markers').select('*')

    // Apply filters
    if (config.marker_ids) {
      query.in('id', config.marker_ids)
    } else if (config.regenerate_all) {
      // Process all markers
    } else {
      // Only process markers without .mind files
      query.is('mind_file_url', null)
    }

    const { data: markers, error } = await query
    if (error) throw error

    const total = markers?.length || 0

    // Update total items
    await supabase.from('batch_jobs').update({ total_items: total }).eq('id', job.id)

    // Process each marker
    for (const marker of markers || []) {
      try {
        // Create queue item
        const { data: queueItem } = await supabase
          .from('batch_queue_items')
          .insert({
            job_id: job.id,
            item_type: 'ar_marker',
            item_id: marker.id,
            status: 'processing',
          })
          .select()
          .single()

        // Download marker image
        const { data: fileData } = await supabase.storage
          .from('ar-markers')
          .download(marker.image_url)

        if (!fileData) throw new Error('Failed to download marker image')

        // Convert to base64
        const buffer = Buffer.from(await fileData.arrayBuffer())
        const base64 = buffer.toString('base64')
        const imageDataUrl = `data:image/jpeg;base64,${base64}`

        // Compile MindAR file
        const mindARData = await compileOptimizedMindAR(imageDataUrl, config.quality || 'auto', {
          algorithm: config.algorithm || 'hybrid',
          performanceMode: config.performance_mode || 'balanced',
        })

        // Upload .mind file
        const mindPath = `mind-files/${marker.id}.mind`
        const { error: uploadError } = await supabase.storage
          .from('ar-markers')
          .upload(mindPath, mindARData, {
            upsert: true,
            contentType: 'application/octet-stream',
          })

        if (uploadError) throw uploadError

        // Update marker record
        await supabase
          .from('ar_markers')
          .update({
            mind_file_url: mindPath,
            metadata: {
              ...marker.metadata,
              mind_generated_at: new Date().toISOString(),
              mind_generation_config: config,
            },
          })
          .eq('id', marker.id)

        // Update queue item
        await supabase
          .from('batch_queue_items')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            processing_data: {
              mind_file_size: mindARData.byteLength,
              algorithm: config.algorithm || 'hybrid',
            },
          })
          .eq('id', queueItem?.id)

        processed++

        // Update progress
        await supabase.from('batch_jobs').update({ processed_items: processed }).eq('id', job.id)
      } catch (itemError) {
        failed++
        errors.push({
          marker_id: marker.id,
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
          .eq('item_id', marker.id)
          .eq('job_id', job.id)
      }
    }

    return {
      total,
      processed,
      failed,
      summary: {
        mind_files_generated: processed,
        generation_config: config,
        errors: errors.slice(0, 10),
      },
    }
  } catch (error) {
    throw error
  }
}
