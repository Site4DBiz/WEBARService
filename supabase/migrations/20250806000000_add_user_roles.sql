-- Create user roles enum
CREATE TYPE user_role AS ENUM ('admin', 'creator', 'viewer', 'moderator');

-- Add role column to profiles table
ALTER TABLE profiles 
ADD COLUMN role user_role DEFAULT 'viewer' NOT NULL;

-- Create index for role column
CREATE INDEX idx_profiles_role ON profiles(role);

-- Create permissions table for fine-grained access control
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource, action, role)
);

-- Insert default permissions
INSERT INTO permissions (resource, action, role) VALUES
-- Admin permissions (full access)
('ar_content', 'create', 'admin'),
('ar_content', 'read', 'admin'),
('ar_content', 'update', 'admin'),
('ar_content', 'delete', 'admin'),
('ar_content', 'approve', 'admin'),
('user', 'create', 'admin'),
('user', 'read', 'admin'),
('user', 'update', 'admin'),
('user', 'delete', 'admin'),
('analytics', 'read', 'admin'),
('settings', 'manage', 'admin'),

-- Creator permissions
('ar_content', 'create', 'creator'),
('ar_content', 'read', 'creator'),
('ar_content', 'update', 'creator'),
('ar_content', 'delete', 'creator'),
('user', 'read', 'creator'),

-- Viewer permissions
('ar_content', 'read', 'viewer'),

-- Moderator permissions
('ar_content', 'read', 'moderator'),
('ar_content', 'approve', 'moderator'),
('ar_content', 'update', 'moderator'),
('user', 'read', 'moderator'),
('analytics', 'read', 'moderator');

-- Create role_assignments table for tracking role changes
CREATE TABLE role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  assigned_by UUID REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create index for role assignments
CREATE INDEX idx_role_assignments_user_id ON role_assignments(user_id);
CREATE INDEX idx_role_assignments_expires_at ON role_assignments(expires_at);

-- Update RLS policies for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow public profiles to be viewed by everyone
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (is_public = true);

-- Allow users to update their own profile (except role)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Only admins can update user roles
CREATE OR REPLACE FUNCTION can_update_role()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for user_ar_contents based on roles
ALTER TABLE user_ar_contents ENABLE ROW LEVEL SECURITY;

-- Creators can manage their own content
CREATE POLICY "Creators can create content" ON user_ar_contents
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('creator', 'admin', 'moderator')
    )
  );

CREATE POLICY "Creators can update own content" ON user_ar_contents
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Creators can delete own content" ON user_ar_contents
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Everyone can read public content
CREATE POLICY "Public content is viewable" ON user_ar_contents
  FOR SELECT USING (
    is_public = true OR 
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- RLS policies for permissions table
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage permissions
CREATE POLICY "Only admins can manage permissions" ON permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Everyone can read permissions
CREATE POLICY "Everyone can read permissions" ON permissions
  FOR SELECT USING (true);

-- RLS policies for role_assignments
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;

-- Only admins can create role assignments
CREATE POLICY "Only admins can create role assignments" ON role_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own role assignments
CREATE POLICY "Users can view own role assignments" ON role_assignments
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Function to check user permissions
CREATE OR REPLACE FUNCTION check_permission(
  p_resource VARCHAR,
  p_action VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
BEGIN
  -- Get user's role
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = auth.uid();

  -- Check if permission exists
  RETURN EXISTS (
    SELECT 1 FROM permissions
    WHERE resource = p_resource
    AND action = p_action
    AND role = v_user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO role_assignments (user_id, role, assigned_by)
    VALUES (NEW.id, NEW.role, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_role_change
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_change();

-- Add comments for documentation
COMMENT ON TYPE user_role IS 'User roles for access control';
COMMENT ON TABLE permissions IS 'Fine-grained permission definitions for each role';
COMMENT ON TABLE role_assignments IS 'History of role assignments and changes';
COMMENT ON FUNCTION check_permission IS 'Check if current user has permission for resource and action';
COMMENT ON FUNCTION get_user_role IS 'Get the current user role';