CREATE TABLE IF NOT EXISTS analytics_events (
  event_id uuid PRIMARY KEY,
  device_id uuid NOT NULL,
  run_id uuid NOT NULL,
  story_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('start','scene_enter','choice','interaction','complete','replay','heartbeat')),
  scene_id text,
  choice_id text,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_story_time_idx ON analytics_events (story_id, occurred_at);
CREATE INDEX IF NOT EXISTS analytics_run_time_idx ON analytics_events (run_id, occurred_at);
