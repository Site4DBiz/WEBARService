-- Create storage bucket for 3D models if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ar-models',
  'ar-models',
  true,
  52428800, -- 50MB
  ARRAY[
    'model/gltf-binary',
    'model/gltf+json',
    'application/octet-stream',
    'application/x-fbx',
    'text/plain',
    'model/obj'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'model/gltf-binary',
    'model/gltf+json',
    'application/octet-stream',
    'application/x-fbx',
    'text/plain',
    'model/obj'
  ]::text[];

-- Create RLS policies for ar-models bucket
CREATE POLICY "Give users access to own folder ar-models" ON storage.objects
  FOR ALL USING (bucket_id = 'ar-models' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow public read access to ar-models" ON storage.objects
  FOR SELECT USING (bucket_id = 'ar-models');

CREATE POLICY "Allow authenticated users to upload ar-models" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ar-models' AND auth.role() = 'authenticated');

CREATE POLICY "Allow users to update own ar-models" ON storage.objects
  FOR UPDATE USING (bucket_id = 'ar-models' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete own ar-models" ON storage.objects
  FOR DELETE USING (bucket_id = 'ar-models' AND auth.uid()::text = (storage.foldername(name))[1]);