/*
# Create Storage Buckets

Creates storage buckets for:
- `posts` — user post media (images/videos)
- `avatars` — user profile pictures
- `stories` — story media
- `messages` — media sent in direct messages

All buckets are public-read so media URLs can be displayed.
Writes are controlled by RLS policies on storage.objects.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('posts', 'posts', true),
  ('avatars', 'avatars', true),
  ('stories', 'stories', true),
  ('messages', 'messages', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload, everyone can read (public buckets)
DROP POLICY IF EXISTS "storage_posts_read" ON storage.objects;
CREATE POLICY "storage_posts_read" ON storage.objects FOR SELECT
  TO public USING (bucket_id IN ('posts', 'avatars', 'stories', 'messages'));

DROP POLICY IF EXISTS "storage_posts_upload" ON storage.objects;
CREATE POLICY "storage_posts_upload" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id IN ('posts', 'avatars', 'stories', 'messages'));

DROP POLICY IF EXISTS "storage_posts_update_own" ON storage.objects;
CREATE POLICY "storage_posts_update_own" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id IN ('posts', 'avatars', 'stories', 'messages') AND owner = auth.uid())
  WITH CHECK (bucket_id IN ('posts', 'avatars', 'stories', 'messages') AND owner = auth.uid());

DROP POLICY IF EXISTS "storage_posts_delete_own" ON storage.objects;
CREATE POLICY "storage_posts_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id IN ('posts', 'avatars', 'stories', 'messages') AND owner = auth.uid());
