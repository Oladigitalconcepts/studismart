DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND coalesce(array_length(storage.foldername(name), 1), 0) >= 1
  AND name <> ''
);