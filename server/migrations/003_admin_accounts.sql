CREATE TABLE IF NOT EXISTS admin_accounts (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE account_sessions ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES admin_accounts(id);
