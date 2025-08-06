-- ARマーカー管理テーブルの作成
CREATE TABLE IF NOT EXISTS ar_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  marker_image_url TEXT NOT NULL,
  marker_pattern_url TEXT, -- .mindファイルのURL（将来の実装用）
  width DECIMAL(10, 2) DEFAULT 1.0, -- ターゲット幅（メートル）
  height DECIMAL(10, 2) DEFAULT 1.0, -- ターゲット高さ（メートル）
  quality_score INTEGER DEFAULT 0, -- トラッキング品質スコア（0-100）
  metadata JSONB DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_ar_markers_user_id ON ar_markers(user_id);
CREATE INDEX idx_ar_markers_is_public ON ar_markers(is_public);
CREATE INDEX idx_ar_markers_category ON ar_markers(category);
CREATE INDEX idx_ar_markers_created_at ON ar_markers(created_at DESC);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ar_markers_updated_at
  BEFORE UPDATE ON ar_markers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) の設定
ALTER TABLE ar_markers ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは自分のマーカーを作成できる
CREATE POLICY "Users can create their own markers" ON ar_markers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のマーカーを読み取れる
CREATE POLICY "Users can read their own markers" ON ar_markers
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_public = true);

-- ユーザーは自分のマーカーを更新できる
CREATE POLICY "Users can update their own markers" ON ar_markers
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のマーカーを削除できる
CREATE POLICY "Users can delete their own markers" ON ar_markers
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 匿名ユーザーは公開マーカーのみ読み取れる
CREATE POLICY "Anonymous users can read public markers" ON ar_markers
  FOR SELECT TO anon
  USING (is_public = true);

-- マーカー使用履歴テーブル
CREATE TABLE IF NOT EXISTS ar_marker_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marker_id UUID REFERENCES ar_markers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  duration_seconds INTEGER,
  detection_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_ar_marker_usage_marker_id ON ar_marker_usage(marker_id);
CREATE INDEX idx_ar_marker_usage_user_id ON ar_marker_usage(user_id);
CREATE INDEX idx_ar_marker_usage_created_at ON ar_marker_usage(created_at DESC);

-- マーカー使用履歴のRLS設定
ALTER TABLE ar_marker_usage ENABLE ROW LEVEL SECURITY;

-- マーカー所有者は自分のマーカーの使用履歴を見れる
CREATE POLICY "Marker owners can view usage" ON ar_marker_usage
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ar_markers
      WHERE ar_markers.id = ar_marker_usage.marker_id
      AND ar_markers.user_id = auth.uid()
    )
  );

-- システムは使用履歴を記録できる
CREATE POLICY "System can insert usage" ON ar_marker_usage
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- お気に入りマーカーテーブル
CREATE TABLE IF NOT EXISTS ar_marker_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  marker_id UUID REFERENCES ar_markers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, marker_id)
);

-- インデックスの作成
CREATE INDEX idx_ar_marker_favorites_user_id ON ar_marker_favorites(user_id);
CREATE INDEX idx_ar_marker_favorites_marker_id ON ar_marker_favorites(marker_id);

-- お気に入りのRLS設定
ALTER TABLE ar_marker_favorites ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のお気に入りを管理できる
CREATE POLICY "Users can manage their favorites" ON ar_marker_favorites
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ビュー数を増やす関数
CREATE OR REPLACE FUNCTION increment_marker_view_count(marker_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ar_markers
  SET view_count = view_count + 1
  WHERE id = marker_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 人気マーカーを取得する関数
CREATE OR REPLACE FUNCTION get_popular_markers(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  marker_image_url TEXT,
  view_count INTEGER,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name,
    m.description,
    m.marker_image_url,
    m.view_count,
    m.user_id,
    m.created_at
  FROM ar_markers m
  WHERE m.is_public = true
  ORDER BY m.view_count DESC, m.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;