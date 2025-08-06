-- Content approval workflow tables
CREATE TYPE approval_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'published');
CREATE TYPE approval_action AS ENUM ('submit_for_review', 'approve', 'reject', 'request_changes', 'publish');

-- Content approvals table
CREATE TABLE content_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES ar_contents(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL DEFAULT 'ar_content',
  status approval_status NOT NULL DEFAULT 'draft',
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval history table
CREATE TABLE approval_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_id UUID NOT NULL REFERENCES content_approvals(id) ON DELETE CASCADE,
  action approval_action NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  from_status approval_status,
  to_status approval_status,
  comment TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Approval rules table
CREATE TABLE approval_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'ar_content',
  auto_approve BOOLEAN DEFAULT FALSE,
  require_admin_approval BOOLEAN DEFAULT FALSE,
  min_reviewers INTEGER DEFAULT 1,
  conditions JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags table
CREATE TABLE tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  parent_id UUID REFERENCES tags(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content tags junction table
CREATE TABLE content_tags (
  content_id UUID NOT NULL REFERENCES ar_contents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (content_id, tag_id)
);

-- Content categories junction table
CREATE TABLE content_categories (
  content_id UUID NOT NULL REFERENCES ar_contents(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (content_id, category_id)
);

-- Create indexes
CREATE INDEX idx_content_approvals_content_id ON content_approvals(content_id);
CREATE INDEX idx_content_approvals_status ON content_approvals(status);
CREATE INDEX idx_content_approvals_submitted_by ON content_approvals(submitted_by);
CREATE INDEX idx_approval_history_approval_id ON approval_history(approval_id);
CREATE INDEX idx_approval_history_performed_by ON approval_history(performed_by);
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_content_tags_content_id ON content_tags(content_id);
CREATE INDEX idx_content_tags_tag_id ON content_tags(tag_id);
CREATE INDEX idx_content_categories_content_id ON content_categories(content_id);
CREATE INDEX idx_content_categories_category_id ON content_categories(category_id);

-- Create RLS policies
ALTER TABLE content_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;

-- Content approvals policies
CREATE POLICY "Users can view their own content approvals"
  ON content_approvals FOR SELECT
  USING (auth.uid() = submitted_by OR EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
  ));

CREATE POLICY "Users can create approval requests for their content"
  ON content_approvals FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Moderators can update approval status"
  ON content_approvals FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
  ));

-- Approval history policies
CREATE POLICY "Users can view approval history"
  ON approval_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content_approvals ca
      WHERE ca.id = approval_history.approval_id
      AND (ca.submitted_by = auth.uid() OR EXISTS (
        SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
      ))
    )
  );

CREATE POLICY "System can insert approval history"
  ON approval_history FOR INSERT
  WITH CHECK (auth.uid() = performed_by);

-- Tags policies
CREATE POLICY "Anyone can view tags"
  ON tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tags"
  ON tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Categories policies
CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT
  USING (active = true OR EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
  ));

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Content tags policies
CREATE POLICY "Anyone can view content tags"
  ON content_tags FOR SELECT
  USING (true);

CREATE POLICY "Content owners can manage tags"
  ON content_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ar_contents
      WHERE id = content_tags.content_id
      AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Content categories policies
CREATE POLICY "Anyone can view content categories"
  ON content_categories FOR SELECT
  USING (true);

CREATE POLICY "Content owners can manage categories"
  ON content_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ar_contents
      WHERE id = content_categories.content_id
      AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_content_approvals_updated_at
  BEFORE UPDATE ON content_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_rules_updated_at
  BEFORE UPDATE ON approval_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, slug, description, icon, sort_order) VALUES
  ('Education', 'education', 'Educational AR content', '📚', 1),
  ('Entertainment', 'entertainment', 'Entertainment and gaming AR content', '🎮', 2),
  ('Business', 'business', 'Business and professional AR content', '💼', 3),
  ('Art & Design', 'art-design', 'Artistic and creative AR content', '🎨', 4),
  ('Technology', 'technology', 'Tech demos and experiments', '🔬', 5),
  ('Marketing', 'marketing', 'Marketing and advertising AR content', '📢', 6),
  ('Events', 'events', 'Event-specific AR content', '🎉', 7),
  ('Other', 'other', 'Uncategorized AR content', '📦', 99);

-- Insert default tags
INSERT INTO tags (name, slug, description, color) VALUES
  ('3D Model', '3d-model', 'Content includes 3D models', '#10B981'),
  ('Animation', 'animation', 'Animated content', '#F59E0B'),
  ('Interactive', 'interactive', 'Interactive AR experience', '#8B5CF6'),
  ('Tutorial', 'tutorial', 'Educational tutorial content', '#3B82F6'),
  ('Demo', 'demo', 'Demonstration content', '#EC4899'),
  ('Beta', 'beta', 'Beta version content', '#6B7280'),
  ('Featured', 'featured', 'Featured content', '#EF4444'),
  ('Popular', 'popular', 'Popular content', '#F97316');

-- Create view for content with approval status
CREATE OR REPLACE VIEW content_with_approval AS
SELECT 
  ac.*,
  ca.status as approval_status,
  ca.submitted_at,
  ca.reviewed_at,
  ca.published_at,
  ca.rejection_reason,
  ca.notes as approval_notes,
  CASE 
    WHEN ca.status = 'published' THEN TRUE
    ELSE FALSE
  END as is_published
FROM ar_contents ac
LEFT JOIN content_approvals ca ON ac.id = ca.content_id;

-- Create function to submit content for approval
CREATE OR REPLACE FUNCTION submit_content_for_approval(
  p_content_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_approval_id UUID;
  v_current_status approval_status;
BEGIN
  -- Check if approval record exists
  SELECT id, status INTO v_approval_id, v_current_status
  FROM content_approvals
  WHERE content_id = p_content_id;

  IF v_approval_id IS NULL THEN
    -- Create new approval record
    INSERT INTO content_approvals (content_id, status, submitted_by, submitted_at, notes)
    VALUES (p_content_id, 'pending_review', auth.uid(), NOW(), p_notes)
    RETURNING id INTO v_approval_id;
  ELSE
    -- Update existing approval record
    IF v_current_status IN ('draft', 'rejected') THEN
      UPDATE content_approvals
      SET status = 'pending_review',
          submitted_by = auth.uid(),
          submitted_at = NOW(),
          notes = p_notes,
          rejection_reason = NULL
      WHERE id = v_approval_id;
    ELSE
      RAISE EXCEPTION 'Content is already in review or published';
    END IF;
  END IF;

  -- Add to history
  INSERT INTO approval_history (approval_id, action, performed_by, from_status, to_status, comment)
  VALUES (v_approval_id, 'submit_for_review', auth.uid(), v_current_status, 'pending_review', p_notes);

  RETURN v_approval_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to approve content
CREATE OR REPLACE FUNCTION approve_content(
  p_approval_id UUID,
  p_comment TEXT DEFAULT NULL,
  p_auto_publish BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_status approval_status;
  v_new_status approval_status;
BEGIN
  -- Check current status
  SELECT status INTO v_current_status
  FROM content_approvals
  WHERE id = p_approval_id;

  IF v_current_status != 'pending_review' THEN
    RAISE EXCEPTION 'Content is not pending review';
  END IF;

  -- Determine new status
  v_new_status := CASE WHEN p_auto_publish THEN 'published' ELSE 'approved' END;

  -- Update approval record
  UPDATE content_approvals
  SET status = v_new_status,
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      published_by = CASE WHEN p_auto_publish THEN auth.uid() ELSE NULL END,
      published_at = CASE WHEN p_auto_publish THEN NOW() ELSE NULL END
  WHERE id = p_approval_id;

  -- Add to history
  INSERT INTO approval_history (approval_id, action, performed_by, from_status, to_status, comment)
  VALUES (p_approval_id, 'approve', auth.uid(), v_current_status, v_new_status, p_comment);

  -- Update content visibility if published
  IF p_auto_publish THEN
    UPDATE ar_contents
    SET is_public = TRUE
    WHERE id = (SELECT content_id FROM content_approvals WHERE id = p_approval_id);
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reject content
CREATE OR REPLACE FUNCTION reject_content(
  p_approval_id UUID,
  p_reason TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_status approval_status;
BEGIN
  -- Check current status
  SELECT status INTO v_current_status
  FROM content_approvals
  WHERE id = p_approval_id;

  IF v_current_status != 'pending_review' THEN
    RAISE EXCEPTION 'Content is not pending review';
  END IF;

  -- Update approval record
  UPDATE content_approvals
  SET status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      rejection_reason = p_reason
  WHERE id = p_approval_id;

  -- Add to history
  INSERT INTO approval_history (approval_id, action, performed_by, from_status, to_status, comment)
  VALUES (p_approval_id, 'reject', auth.uid(), v_current_status, 'rejected', p_comment);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;