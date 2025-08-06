-- 利用統計ダッシュボード用テーブル

-- ARセッショントラッキングテーブル
CREATE TABLE IF NOT EXISTS ar_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID REFERENCES ar_contents(id) ON DELETE SET NULL,
  marker_id UUID REFERENCES ar_markers(id) ON DELETE SET NULL,
  session_id VARCHAR(255) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  detection_success BOOLEAN DEFAULT false,
  detection_time FLOAT,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  ip_address INET,
  location JSONB,
  user_agent TEXT,
  quality_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- セッションインデックス
CREATE INDEX idx_ar_sessions_user_id ON ar_sessions(user_id);
CREATE INDEX idx_ar_sessions_content_id ON ar_sessions(content_id);
CREATE INDEX idx_ar_sessions_marker_id ON ar_sessions(marker_id);
CREATE INDEX idx_ar_sessions_created_at ON ar_sessions(created_at);
CREATE INDEX idx_ar_sessions_session_id ON ar_sessions(session_id);

-- システムメトリクステーブル
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(100) NOT NULL,
  metric_value FLOAT NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- メトリクスインデックス
CREATE INDEX idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX idx_system_metrics_recorded_at ON system_metrics(recorded_at);

-- 日次利用統計マテリアライズドビュー
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_usage_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as total_activities,
  COUNT(CASE WHEN activity_type = 'session' THEN 1 END) as total_sessions,
  COUNT(CASE WHEN activity_type = 'create' THEN 1 END) as content_created,
  COUNT(CASE WHEN activity_type = 'view' THEN 1 END) as content_viewed
FROM user_activity_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ビューのインデックス
CREATE INDEX idx_daily_usage_stats_date ON daily_usage_stats(date);

-- コンテンツ統計マテリアライズドビュー
CREATE MATERIALIZED VIEW IF NOT EXISTS content_statistics AS
SELECT 
  c.id,
  c.title,
  c.category,
  c.created_at,
  c.view_count,
  c.like_count,
  c.share_count,
  c.is_public,
  c.is_featured,
  c.is_approved,
  p.username as creator_name,
  p.role as creator_role,
  COUNT(DISTINCT s.user_id) as unique_viewers,
  AVG(s.duration_seconds) as avg_session_duration,
  SUM(CASE WHEN s.detection_success THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(s.id), 0) as success_rate
FROM ar_contents c
LEFT JOIN profiles p ON c.created_by = p.id
LEFT JOIN ar_sessions s ON c.id = s.content_id
GROUP BY c.id, c.title, c.category, c.created_at, c.view_count, c.like_count, c.share_count, 
         c.is_public, c.is_featured, c.is_approved, p.username, p.role;

-- マーカー統計マテリアライズドビュー
CREATE MATERIALIZED VIEW IF NOT EXISTS marker_statistics AS
SELECT 
  m.id,
  m.name,
  m.category,
  m.created_at,
  m.quality_score,
  m.view_count,
  m.is_public,
  p.username as creator_name,
  COUNT(DISTINCT s.user_id) as unique_users,
  AVG(s.detection_time) as avg_detection_time,
  SUM(CASE WHEN s.detection_success THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(s.id), 0) as success_rate
FROM ar_markers m
LEFT JOIN profiles p ON m.created_by = p.id
LEFT JOIN ar_sessions s ON m.id = s.marker_id
GROUP BY m.id, m.name, m.category, m.created_at, m.quality_score, m.view_count, m.is_public, p.username;

-- ユーザー活動統計マテリアライズドビュー
CREATE MATERIALIZED VIEW IF NOT EXISTS user_activity_statistics AS
SELECT 
  p.id,
  p.username,
  p.role,
  p.subscription_tier,
  p.created_at as user_created_at,
  COUNT(DISTINCT DATE(a.created_at)) as active_days,
  COUNT(a.id) as total_activities,
  MAX(a.created_at) as last_activity,
  COUNT(DISTINCT c.id) as content_created,
  COUNT(DISTINCT m.id) as markers_created,
  COUNT(DISTINCT s.session_id) as total_sessions,
  AVG(s.duration_seconds) as avg_session_duration
FROM profiles p
LEFT JOIN user_activity_logs a ON p.id = a.user_id
LEFT JOIN ar_contents c ON p.id = c.created_by
LEFT JOIN ar_markers m ON p.id = m.created_by
LEFT JOIN ar_sessions s ON p.id = s.user_id
GROUP BY p.id, p.username, p.role, p.subscription_tier, p.created_at;

-- ダッシュボードメトリクス関数
CREATE OR REPLACE FUNCTION get_dashboard_metrics(
  date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  date_to DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  total_content BIGINT,
  total_markers BIGINT,
  total_sessions BIGINT,
  avg_session_duration NUMERIC,
  content_views BIGINT,
  content_likes BIGINT,
  new_users_period BIGINT,
  new_content_period BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM profiles)::BIGINT as total_users,
    (SELECT COUNT(DISTINCT user_id) FROM user_activity_logs 
     WHERE created_at BETWEEN date_from AND date_to + INTERVAL '1 day')::BIGINT as active_users,
    (SELECT COUNT(*) FROM ar_contents WHERE is_approved = true)::BIGINT as total_content,
    (SELECT COUNT(*) FROM ar_markers)::BIGINT as total_markers,
    (SELECT COUNT(*) FROM ar_sessions 
     WHERE created_at BETWEEN date_from AND date_to + INTERVAL '1 day')::BIGINT as total_sessions,
    (SELECT AVG(duration_seconds) FROM ar_sessions 
     WHERE created_at BETWEEN date_from AND date_to + INTERVAL '1 day')::NUMERIC as avg_session_duration,
    (SELECT SUM(view_count) FROM ar_contents)::BIGINT as content_views,
    (SELECT SUM(like_count) FROM ar_contents)::BIGINT as content_likes,
    (SELECT COUNT(*) FROM profiles 
     WHERE created_at BETWEEN date_from AND date_to + INTERVAL '1 day')::BIGINT as new_users_period,
    (SELECT COUNT(*) FROM ar_contents 
     WHERE created_at BETWEEN date_from AND date_to + INTERVAL '1 day')::BIGINT as new_content_period;
END;
$$ LANGUAGE plpgsql;

-- リアルタイム統計関数
CREATE OR REPLACE FUNCTION get_realtime_stats()
RETURNS TABLE (
  current_active_users INTEGER,
  active_sessions INTEGER,
  today_new_users INTEGER,
  today_new_content INTEGER,
  today_sessions INTEGER,
  system_health VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(DISTINCT user_id) FROM user_activity_logs 
     WHERE created_at > NOW() - INTERVAL '15 minutes')::INTEGER as current_active_users,
    (SELECT COUNT(*) FROM ar_sessions 
     WHERE started_at > NOW() - INTERVAL '15 minutes' AND ended_at IS NULL)::INTEGER as active_sessions,
    (SELECT COUNT(*) FROM profiles 
     WHERE DATE(created_at) = CURRENT_DATE)::INTEGER as today_new_users,
    (SELECT COUNT(*) FROM ar_contents 
     WHERE DATE(created_at) = CURRENT_DATE)::INTEGER as today_new_content,
    (SELECT COUNT(*) FROM ar_sessions 
     WHERE DATE(started_at) = CURRENT_DATE)::INTEGER as today_sessions,
    CASE 
      WHEN (SELECT COUNT(*) FROM system_metrics 
            WHERE metric_type = 'error_rate' 
            AND recorded_at > NOW() - INTERVAL '1 hour' 
            AND metric_value > 0.1) > 0 
      THEN 'warning'::VARCHAR(20)
      ELSE 'healthy'::VARCHAR(20)
    END as system_health;
END;
$$ LANGUAGE plpgsql;

-- カテゴリー別統計関数
CREATE OR REPLACE FUNCTION get_category_statistics()
RETURNS TABLE (
  category VARCHAR(100),
  content_count BIGINT,
  total_views BIGINT,
  total_likes BIGINT,
  avg_quality_score NUMERIC,
  active_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.category,
    COUNT(DISTINCT c.id)::BIGINT as content_count,
    SUM(c.view_count)::BIGINT as total_views,
    SUM(c.like_count)::BIGINT as total_likes,
    AVG(m.quality_score)::NUMERIC as avg_quality_score,
    COUNT(DISTINCT s.user_id)::BIGINT as active_users
  FROM ar_contents c
  LEFT JOIN ar_markers m ON c.marker_id = m.id
  LEFT JOIN ar_sessions s ON c.id = s.content_id
  WHERE c.category IS NOT NULL
  GROUP BY c.category
  ORDER BY total_views DESC;
END;
$$ LANGUAGE plpgsql;

-- トレンド分析関数
CREATE OR REPLACE FUNCTION get_trend_analysis(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  new_users INTEGER,
  active_users INTEGER,
  new_content INTEGER,
  sessions INTEGER,
  avg_session_duration NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.date,
    COUNT(DISTINCT CASE WHEN DATE(p.created_at) = d.date THEN p.id END)::INTEGER as new_users,
    COUNT(DISTINCT a.user_id)::INTEGER as active_users,
    COUNT(DISTINCT CASE WHEN DATE(c.created_at) = d.date THEN c.id END)::INTEGER as new_content,
    COUNT(DISTINCT s.id)::INTEGER as sessions,
    AVG(s.duration_seconds)::NUMERIC as avg_session_duration
  FROM generate_series(
    CURRENT_DATE - INTERVAL '1 day' * days_back,
    CURRENT_DATE,
    INTERVAL '1 day'
  ) as d(date)
  LEFT JOIN profiles p ON DATE(p.created_at) = d.date
  LEFT JOIN user_activity_logs a ON DATE(a.created_at) = d.date
  LEFT JOIN ar_contents c ON DATE(c.created_at) = d.date
  LEFT JOIN ar_sessions s ON DATE(s.created_at) = d.date
  GROUP BY d.date
  ORDER BY d.date DESC;
END;
$$ LANGUAGE plpgsql;

-- RLSポリシー設定
ALTER TABLE ar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- ARセッションポリシー
CREATE POLICY "Users can view own sessions" ON ar_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all sessions" ON ar_sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Admin can view all sessions" ON ar_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- システムメトリクスポリシー
CREATE POLICY "Admin can view system metrics" ON system_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Service role can manage system metrics" ON system_metrics
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- マテリアライズドビューの自動更新
CREATE OR REPLACE FUNCTION refresh_statistics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_usage_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY content_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY marker_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_statistics;
END;
$$ LANGUAGE plpgsql;

-- 定期的な更新のためのトリガー（実際の実装はcronジョブまたはSupabase Functionで行う）
COMMENT ON FUNCTION refresh_statistics_views() IS 'Call this function periodically to refresh statistics views';