CREATE TABLE IF NOT EXISTS user_notifications (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('not_'),
  user_id text REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  token text NOT NULL UNIQUE,
  device_id text, -- Optional: to track multiple devices per user/platform
  device_name text, -- Optional: user-friendly device name
  enabled boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz -- Consistent with other tables in your codebase
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_platform ON user_notifications (user_id, platform);
CREATE INDEX IF NOT EXISTS idx_user_notifications_enabled ON user_notifications (enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_user_notifications_token ON user_notifications (token);