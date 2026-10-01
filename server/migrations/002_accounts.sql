CREATE TABLE IF NOT EXISTS parent_accounts (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  full_name text NOT NULL,
  password_hash text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS account_sessions (
  token_hash text PRIMARY KEY,
  parent_id uuid REFERENCES parent_accounts(id),
  role text NOT NULL CHECK (role IN ('parent','admin')),
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS registration_invites (
  id uuid PRIMARY KEY,
  code_hash text NOT NULL UNIQUE,
  label text NOT NULL,
  remaining_uses integer NOT NULL CHECK (remaining_uses >= 0),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY,
  name text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS child_profiles (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  parent_id uuid NOT NULL REFERENCES parent_accounts(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  age integer NOT NULL CHECK (age BETWEEN 3 AND 18),
  school_id uuid NOT NULL REFERENCES schools(id),
  avatar text NOT NULL DEFAULT '🦊',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS child_parent_idx ON child_profiles(parent_id);
CREATE INDEX IF NOT EXISTS child_demographics_idx ON child_profiles(age,school_id);
CREATE TABLE IF NOT EXISTS game_runs (
  id uuid PRIMARY KEY,
  child_id uuid NOT NULL REFERENCES child_profiles(id),
  story_id text NOT NULL,
  age_at_play integer NOT NULL,
  school_id_at_play uuid NOT NULL REFERENCES schools(id),
  school_name_at_play text NOT NULL,
  scoring_version text NOT NULL,
  progress jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_event_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  active_ms bigint NOT NULL DEFAULT 0,
  percent numeric NOT NULL DEFAULT 0,
  stars integer NOT NULL DEFAULT 0,
  badge text,
  medal text,
  last_sequence integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS game_runs_child_time_idx ON game_runs(child_id,started_at);
CREATE INDEX IF NOT EXISTS game_runs_demographics_idx ON game_runs(age_at_play,school_id_at_play,started_at);
CREATE UNIQUE INDEX IF NOT EXISTS game_run_one_active_idx ON game_runs(child_id,story_id) WHERE completed_at IS NULL;
CREATE TABLE IF NOT EXISTS child_game_events (
  event_id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES game_runs(id),
  event_type text NOT NULL,
  scene_id text NOT NULL,
  choice_id text,
  details jsonb NOT NULL DEFAULT '{}',
  score_delta integer NOT NULL DEFAULT 0,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS child_events_run_idx ON child_game_events(run_id,received_at);
ALTER TABLE game_runs ADD COLUMN IF NOT EXISTS last_occurred_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE game_runs ADD COLUMN IF NOT EXISTS score_result jsonb NOT NULL DEFAULT '{}';
