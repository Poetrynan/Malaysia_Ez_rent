-- Migration 014: Allow students to update their own tenant_interests (re-submit / cancel via status)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can update own interest'
      AND tablename = 'tenant_interests'
  ) THEN
    CREATE POLICY "Users can update own interest" ON tenant_interests
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
