-- ARマーカーのバージョン管理テーブル
CREATE TABLE IF NOT EXISTS ar_marker_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marker_id UUID NOT NULL REFERENCES ar_markers(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  quality_score INTEGER DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  mime_type TEXT,
  change_description TEXT,
  is_current BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(marker_id, version_number)
);

-- インデックスの作成
CREATE INDEX idx_ar_marker_versions_marker_id ON ar_marker_versions(marker_id);
CREATE INDEX idx_ar_marker_versions_is_current ON ar_marker_versions(is_current);
CREATE INDEX idx_ar_marker_versions_created_at ON ar_marker_versions(created_at);

-- RLSポリシーの有効化
ALTER TABLE ar_marker_versions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー：誰でも公開マーカーのバージョン履歴を閲覧可能
CREATE POLICY "Public marker versions are viewable by everyone"
  ON ar_marker_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ar_markers
      WHERE ar_markers.id = ar_marker_versions.marker_id
      AND ar_markers.is_public = true
    )
  );

-- RLSポリシー：所有者は自分のマーカーのバージョン履歴を閲覧可能
CREATE POLICY "Users can view their own marker versions"
  ON ar_marker_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ar_markers
      WHERE ar_markers.id = ar_marker_versions.marker_id
      AND ar_markers.user_id = auth.uid()
    )
  );

-- RLSポリシー：所有者は自分のマーカーのバージョンを作成可能
CREATE POLICY "Users can create versions for their own markers"
  ON ar_marker_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ar_markers
      WHERE ar_markers.id = ar_marker_versions.marker_id
      AND ar_markers.user_id = auth.uid()
    )
  );

-- RLSポリシー：所有者は自分のマーカーのバージョンを更新可能
CREATE POLICY "Users can update versions for their own markers"
  ON ar_marker_versions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ar_markers
      WHERE ar_markers.id = ar_marker_versions.marker_id
      AND ar_markers.user_id = auth.uid()
    )
  );

-- RLSポリシー：所有者は自分のマーカーのバージョンを削除可能
CREATE POLICY "Users can delete versions for their own markers"
  ON ar_marker_versions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ar_markers
      WHERE ar_markers.id = ar_marker_versions.marker_id
      AND ar_markers.user_id = auth.uid()
    )
  );

-- バージョン更新時のトリガー関数
CREATE OR REPLACE FUNCTION update_marker_version_current()
RETURNS TRIGGER AS $$
BEGIN
  -- 新しいバージョンがis_current = trueの場合、同じマーカーの他のバージョンをfalseに設定
  IF NEW.is_current = true THEN
    UPDATE ar_marker_versions
    SET is_current = false
    WHERE marker_id = NEW.marker_id
    AND id != NEW.id;
    
    -- メインのar_markersテーブルも更新
    UPDATE ar_markers
    SET 
      image_url = NEW.image_url,
      thumbnail_url = NEW.thumbnail_url,
      quality_score = NEW.quality_score,
      updated_at = NOW()
    WHERE id = NEW.marker_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
CREATE TRIGGER trigger_update_marker_version_current
  AFTER INSERT OR UPDATE ON ar_marker_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_marker_version_current();

-- バージョン番号を自動的に設定する関数
CREATE OR REPLACE FUNCTION set_version_number()
RETURNS TRIGGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  -- 既存の最大バージョン番号を取得
  SELECT COALESCE(MAX(version_number), 0) INTO max_version
  FROM ar_marker_versions
  WHERE marker_id = NEW.marker_id;
  
  -- 新しいバージョン番号を設定
  NEW.version_number := max_version + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- バージョン番号自動設定のトリガー
CREATE TRIGGER trigger_set_version_number
  BEFORE INSERT ON ar_marker_versions
  FOR EACH ROW
  WHEN (NEW.version_number IS NULL)
  EXECUTE FUNCTION set_version_number();