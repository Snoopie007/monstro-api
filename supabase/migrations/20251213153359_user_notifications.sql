CREATE TABLE IF NOT EXISTS user_notifications (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  user_id text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  token text NOT NULL UNIQUE,
  device_model_id text,
  device_name text,
  enabled boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_platform ON user_notifications (user_id, platform);
CREATE INDEX IF NOT EXISTS idx_user_notifications_enabled ON user_notifications (enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_user_notifications_token ON user_notifications (token);