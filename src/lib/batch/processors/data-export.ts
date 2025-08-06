import { createClient } from '@/lib/supabase/server'
import { BatchJob, JobResult } from '@/types/batch'

export async function processDataExport(job: BatchJob): Promise<JobResult> {
  const supabase = createClient()
  const config = job.config

  let processed = 0
  let failed = 0
  const exportData: any[] = []

  try {
    const exportType = config.export_type || 'ar_markers'
    let query

    // Determine what to export
    switch (exportType) {
      case 'ar_markers':
        query = supabase.from('ar_markers').select('*')
        if (!config.include_private) {
          query.eq('is_public', true)
        }
        break

      case 'ar_contents':
        query = supabase.from('user_ar_contents').select('*')
        if (!config.include_private) {
          query.eq('is_public', true)
        }
        break

      case 'users':
        query = supabase.from('profiles').select('*')
        break

      case 'statistics':
        // Export aggregated statistics
        const { data: stats } = await supabase.from('batch_job_statistics').select('*')
        exportData.push(...(stats || []))
        processed = stats?.length || 0
        break

      default:
        throw new Error(`Unknown export type: ${exportType}`)
    }

    if (query) {
      // Apply date range filter if specified
      if (config.date_from) {
        query.gte('created_at', config.date_from)
      }
      if (config.date_to) {
        query.lte('created_at', config.date_to)
      }

      const { data, error } = await query
      if (error) throw error

      exportData.push(...(data || []))
      processed = data?.length || 0
    }

    // Update job progress
    await supabase
      .from('batch_jobs')
      .update({
        total_items: processed,
        processed_items: processed,
      })
      .eq('id', job.id)

    // Format data based on export format
    let exportContent: string | Buffer
    let fileName: string
    let mimeType: string

    const format = config.format || 'json'
    const timestamp = new Date().toISOString().split('T')[0]

    switch (format) {
      case 'csv':
        exportContent = convertToCSV(exportData)
        fileName = `export-${exportType}-${timestamp}.csv`
        mimeType = 'text/csv'
        break

      case 'json':
      default:
        exportContent = JSON.stringify(exportData, null, 2)
        fileName = `export-${exportType}-${timestamp}.json`
        mimeType = 'application/json'
        break
    }

    // Upload export file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exports')
      .upload(`batch-exports/${job.id}/${fileName}`, exportContent, {
        contentType: mimeType,
      })

    if (uploadError) {
      // Create bucket if it doesn't exist
      await supabase.storage.createBucket('exports', { public: false })

      // Retry upload
      const { error: retryError } = await supabase.storage
        .from('exports')
        .upload(`batch-exports/${job.id}/${fileName}`, exportContent, {
          contentType: mimeType,
        })

      if (retryError) throw retryError
    }

    // Generate download URL
    const { data: urlData } = supabase.storage
      .from('exports')
      .getPublicUrl(`batch-exports/${job.id}/${fileName}`)

    return {
      total: processed,
      processed,
      failed,
      summary: {
        export_type: exportType,
        format,
        records_exported: processed,
        file_name: fileName,
        download_url: urlData.publicUrl,
      },
    }
  } catch (error) {
    throw error
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  // Get headers from first object
  const headers = Object.keys(data[0])
  const csvHeaders = headers.join(',')

  // Convert data rows
  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header]
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value ?? ''
      })
      .join(',')
  })

  return [csvHeaders, ...csvRows].join('\n')
}
