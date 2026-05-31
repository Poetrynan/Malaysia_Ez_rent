-- 029: Agent registration cleanup policies + storage delete + REN number field
-- Allows admins to delete registration records and their uploaded REN tag images after approval

-- Add REN number field to admin_users (skip if already exists)
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS ren_number VARCHAR(20);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS ren_tag_url TEXT;

-- DELETE policy: admins can delete registration records
DROP POLICY IF EXISTS "Admins can delete registrations" ON agent_registrations;
CREATE POLICY "Admins can delete registrations"
  ON agent_registrations FOR DELETE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Storage DELETE policy: admins can delete REN tag images
DROP POLICY IF EXISTS "Admins can delete REN tags" ON storage.objects;
CREATE POLICY "Admins can delete REN tags"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'unit-media' AND (storage.foldername(name))[1] = 'ren-tags');
