-- バッチ処理ジョブ管理テーブル
CREATE TABLE IF NOT EXISTS batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'marker_optimization', 'mindar_generation', 'content_update', 'data_export', 'statistics_aggregation'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'queued', 'processing', 'completed', 'failed', 'cancelled'
  priority INTEGER DEFAULT 5, -- 1-10, higher is more priority
  schedule_type VARCHAR(50) DEFAULT 'immediate', -- 'immediate', 'scheduled', 'recurring'
  scheduled_at TIMESTAMP WITH TIME ZONE,
  cron_expression VARCHAR(255), -- For recurring jobs
  config JSONB DEFAULT '{}', -- Job-specific configuration
  progress INTEGER DEFAULT 0, -- Progress percentage (0-100)
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- バッチジョブの実行履歴
CREATE TABLE IF NOT EXISTS batch_job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES batch_jobs(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  total_items INTEGER,
  processed_items INTEGER,
  failed_items INTEGER,
  error_logs JSONB DEFAULT '[]',
  result_summary JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- バッチジョブキューアイテム
CREATE TABLE IF NOT EXISTS batch_queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES batch_jobs(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL, -- 'ar_marker', 'ar_content', 'user', etc.
  item_id UUID NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  processing_data JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX idx_batch_jobs_type ON batch_jobs(type);
CREATE INDEX idx_batch_jobs_created_by ON batch_jobs(created_by);
CREATE INDEX idx_batch_jobs_scheduled_at ON batch_jobs(scheduled_at);
CREATE INDEX idx_batch_queue_items_job_id ON batch_queue_items(job_id);
CREATE INDEX idx_batch_queue_items_status ON batch_queue_items(status);
CREATE INDEX idx_batch_job_history_job_id ON batch_job_history(job_id);

-- Row Level Security (RLS) ポリシー
ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_job_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_queue_items ENABLE ROW LEVEL SECURITY;

-- バッチジョブ: 管理者とモデレーターは全て見れる、作成者は自分のジョブのみ
CREATE POLICY "Admins and moderators can view all jobs" ON batch_jobs
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'moderator')
    ) OR created_by = auth.uid()
  );

CREATE POLICY "Admins and moderators can create jobs" ON batch_jobs
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins and moderators can update jobs" ON batch_jobs
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can delete jobs" ON batch_jobs
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- 履歴: ジョブを見れる人は履歴も見れる
CREATE POLICY "View job history" ON batch_job_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM batch_jobs 
      WHERE batch_jobs.id = batch_job_history.job_id
      AND (
        batch_jobs.created_by = auth.uid() OR
        auth.uid() IN (
          SELECT id FROM profiles WHERE role IN ('admin', 'moderator')
        )
      )
    )
  );

-- キューアイテム: ジョブを見れる人はキューアイテムも見れる
CREATE POLICY "View queue items" ON batch_queue_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM batch_jobs 
      WHERE batch_jobs.id = batch_queue_items.job_id
      AND (
        batch_jobs.created_by = auth.uid() OR
        auth.uid() IN (
          SELECT id FROM profiles WHERE role IN ('admin', 'moderator')
        )
      )
    )
  );

-- ジョブステータス更新関数
CREATE OR REPLACE FUNCTION update_batch_job_status()
RETURNS TRIGGER AS $$
BEGIN
  -- ジョブの updated_at を更新
  NEW.updated_at = NOW();
  
  -- 処理開始時
  IF OLD.status != 'processing' AND NEW.status = 'processing' THEN
    NEW.started_at = NOW();
  END IF;
  
  -- 処理完了時
  IF OLD.status IN ('pending', 'queued', 'processing') AND NEW.status IN ('completed', 'failed', 'cancelled') THEN
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_batch_job_status_trigger
  BEFORE UPDATE ON batch_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_job_status();

-- 進捗率自動計算関数
CREATE OR REPLACE FUNCTION calculate_job_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_items > 0 THEN
    NEW.progress = ROUND((NEW.processed_items::NUMERIC / NEW.total_items) * 100);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_job_progress_trigger
  BEFORE UPDATE ON batch_jobs
  FOR EACH ROW
  WHEN (OLD.processed_items IS DISTINCT FROM NEW.processed_items OR OLD.total_items IS DISTINCT FROM NEW.total_items)
  EXECUTE FUNCTION calculate_job_progress();

-- ジョブ統計ビュー
CREATE OR REPLACE VIEW batch_job_statistics AS
SELECT 
  type,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
  COUNT(*) FILTER (WHERE status = 'processing') as active_jobs,
  AVG(CASE 
    WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (completed_at - started_at))
    ELSE NULL 
  END) as avg_duration_seconds,
  AVG(progress) as avg_progress,
  SUM(processed_items) as total_processed_items
FROM batch_jobs
GROUP BY type;