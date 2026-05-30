-- 027: Agent registration cleanup policies + storage delete + REN number field
-- Allows admins to delete registration records and their uploaded REN tag images after approval

-- Add REN number field to admin_users (for display in agent management)
ALTER TABLE admin_users ADD COLUMN ren_number VARCHAR(20);
ALTER TABLE admin_users ADD COLUMN ren_tag_url TEXT;

-- DELETE policy: admins can delete registration records
CREATE POLICY "Admins can delete registrations"
  ON agent_registrations FOR DELETE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Storage DELETE policy: admins can delete REN tag images
CREATE POLICY "Admins can delete REN tags"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'unit-media' AND (storage.foldername(name))[1] = 'ren-tags');
