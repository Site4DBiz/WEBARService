-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_ar_contents
  SET view_count = view_count + 1
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_view_count TO authenticated;