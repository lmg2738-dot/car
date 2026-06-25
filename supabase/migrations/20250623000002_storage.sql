-- Storage bucket for vehicle photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-photos',
  'vehicle-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: organization-scoped access via path prefix
-- Path format: {organization_id}/{vehicle_id}/{filename}

CREATE POLICY "Users can view org vehicle photos storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "Users can upload org vehicle photos storage"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "Users can update org vehicle photos storage"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

CREATE POLICY "Users can delete org vehicle photos storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );
