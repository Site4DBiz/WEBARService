export type BatchJobType =
  | 'marker_optimization'
  | 'mindar_generation'
  | 'content_update'
  | 'data_export'
  | 'statistics_aggregation'

export type JobStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'

export type ScheduleType = 'immediate' | 'scheduled' | 'recurring'

export interface BatchJob {
  id: string
  name: string
  type: BatchJobType
  status: JobStatus
  priority: number
  schedule_type: ScheduleType
  scheduled_at?: string
  cron_expression?: string
  config: Record<string, any>
  progress: number
  total_items: number
  processed_items: number
  failed_items: number
  error_message?: string
  started_at?: string
  completed_at?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface BatchJobHistory {
  id: string
  job_id: string
  status: JobStatus
  started_at: string
  completed_at?: string
  duration_seconds?: number
  total_items: number
  processed_items: number
  failed_items: number
  error_logs: any[]
  result_summary: Record<string, any>
  created_at: string
}

export interface BatchQueueItem {
  id: string
  job_id: string
  item_type: string
  item_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retry_count: number
  max_retries: number
  error_message?: string
  processing_data: Record<string, any>
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface JobResult {
  total: number
  processed: number
  failed: number
  summary: Record<string, any>
}

export interface JobConfig {
  // Marker optimization config
  quality?: 'low' | 'medium' | 'high'
  resize?: boolean
  enhance?: boolean

  // MindAR generation config
  algorithm?: 'fast' | 'harris' | 'orb' | 'hybrid'

  // Content update config
  fields?: string[]
  values?: Record<string, any>

  // Data export config
  format?: 'csv' | 'json' | 'excel'
  include_private?: boolean

  // Statistics aggregation config
  period?: 'day' | 'week' | 'month'
  metrics?: string[]
}
