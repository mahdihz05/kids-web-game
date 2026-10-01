ALTER TABLE parent_accounts ADD COLUMN IF NOT EXISTS access_role text NOT NULL DEFAULT 'parent' CHECK (access_role IN ('parent','player'));
ALTER TABLE parent_accounts ADD COLUMN IF NOT EXISTS player_child_id uuid REFERENCES child_profiles(id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='player_profile_required' AND conrelid='parent_accounts'::regclass) THEN
    ALTER TABLE parent_accounts ADD CONSTRAINT player_profile_required CHECK (access_role <> 'player' OR player_child_id IS NOT NULL);
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS player_child_login_idx ON parent_accounts(player_child_id) WHERE access_role='player';
