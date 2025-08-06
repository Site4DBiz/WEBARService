import { createClient } from '@/lib/supabase/server'
import { BatchJob, JobResult } from '@/types/batch'
import { processMarkerImage } from '@/lib/utils/marker-processor'

export async function processMarkerOptimization(job: BatchJob): Promise<JobResult> {
  const supabase = createClient()
  const config = job.config

  let processed = 0
  let failed = 0
  const errors: any[] = []

  try {
    // Get markers to process based on config
    const query = supabase.from('ar_markers').select('*')

    // Apply filters if specified
    if (config.marker_ids) {
      query.in('id', config.marker_ids)
    } else if (config.user_id) {
      query.eq('user_id', config.user_id)
    } else if (config.category) {
      query.eq('category', config.category)
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

        // Convert Blob to Buffer
        const buffer = Buffer.from(await fileData.arrayBuffer())

        // Process the image
        const qualityValue = config.quality === 'high' ? 95 : config.quality === 'low' ? 70 : 85
        const result = await processMarkerImage(buffer, {
          quality: qualityValue,
          maxWidth: config.resize !== false ? 1024 : undefined,
          maxHeight: config.resize !== false ? 1024 : undefined,
          sharpen: config.enhance !== false,
          contrast: config.enhance !== false ? 1.1 : 1.0,
        })

        // Calculate quality score
        const { calculateMarkerQualityScore } = await import('@/lib/utils/marker-processor')
        const qualityScore = await calculateMarkerQualityScore(result.buffer)

        // Upload optimized image
        const optimizedPath = `optimized/${marker.id}-optimized.jpg`
        const { error: uploadError } = await supabase.storage
          .from('ar-markers')
          .upload(optimizedPath, result.buffer, {
            upsert: true,
            contentType: 'image/jpeg',
          })

        if (uploadError) throw uploadError

        // Update marker record
        await supabase
          .from('ar_markers')
          .update({
            optimized_url: optimizedPath,
            quality_score: qualityScore,
            metadata: {
              ...marker.metadata,
              optimized_at: new Date().toISOString(),
              optimization_config: config,
            },
          })
          .eq('id', marker.id)

        // Update queue item
        await supabase
          .from('batch_queue_items')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            processing_data: { quality_score: qualityScore },
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
        markers_optimized: processed,
        optimization_config: config,
        errors: errors.slice(0, 10), // Limit errors in summary
      },
    }
  } catch (error) {
    throw error
  }
}
