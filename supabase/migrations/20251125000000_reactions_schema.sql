-- ========================
-- DISCORD-STYLE REACTIONS SCHEMA (Single Table)
-- ========================

-- ========================
-- REACTIONS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS reactions (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('rxn_'),
  user_id text REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  owner_type text CHECK (owner_type IN ('message', 'post', 'moment', 'comment')) NOT NULL,
  owner_id text NOT NULL,
  emoji jsonb NOT NULL, -- Store emoji data as JSON: {"type": "unicode", "value": "👍", "name": "thumbs_up"}
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  -- Ensure one reaction per user per item per emoji
  UNIQUE (user_id, owner_type, owner_id, emoji)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reactions_owner ON reactions (owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions (user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_emoji ON reactions USING GIN (emoji);
CREATE INDEX IF NOT EXISTS idx_reactions_created_at ON reactions (created_at);

-- ========================
-- REACTION COUNTS VIEW
-- ========================
-- This view provides aggregated reaction counts for easy querying
CREATE OR REPLACE VIEW reaction_counts AS
SELECT 
  r.owner_type,
  r.owner_id,
  r.emoji,
  r.emoji->>'value' as emoji_display,
  r.emoji->>'name' as emoji_name,
  r.emoji->>'type' as emoji_type,
  COUNT(*) as count,
  array_agg(u.name ORDER BY r.created_at) as user_names,
  array_agg(r.user_id ORDER BY r.created_at) as user_ids
FROM reactions r
JOIN users u ON r.user_id = u.id
GROUP BY r.owner_type, r.owner_id, r.emoji;

-- ========================
-- USER REACTIONS VIEW
-- ========================
-- This view shows what reactions a specific user has made
CREATE OR REPLACE VIEW user_reactions AS
SELECT 
  r.id,
  r.user_id,
  r.owner_type,
  r.owner_id,
  r.emoji,
  r.emoji->>'value' as emoji_display,
  r.emoji->>'name' as emoji_name,
  r.emoji->>'type' as emoji_type,
  r.created_at
FROM reactions r;

-- ========================
-- FUNCTIONS FOR REACTION MANAGEMENT
-- ========================

-- Function to toggle a reaction (add if doesn't exist, remove if exists)
CREATE OR REPLACE FUNCTION toggle_reaction(
  p_user_id text,
  p_owner_type text,
  p_owner_id text,
  p_emoji jsonb
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  reaction_exists boolean;
BEGIN
  -- Check if reaction exists
  SELECT EXISTS(
    SELECT 1 FROM reactions 
    WHERE user_id = p_user_id 
    AND owner_type = p_owner_type 
    AND owner_id = p_owner_id 
    AND emoji = p_emoji
  ) INTO reaction_exists;
  
  IF reaction_exists THEN
    -- Remove reaction
    DELETE FROM reactions 
    WHERE user_id = p_user_id 
    AND owner_type = p_owner_type 
    AND owner_id = p_owner_id 
    AND emoji = p_emoji;
    
    RETURN false; -- Reaction removed
  ELSE
    -- Add reaction
    INSERT INTO reactions (user_id, owner_type, owner_id, emoji)
    VALUES (p_user_id, p_owner_type, p_owner_id, p_emoji);
    
    RETURN true; -- Reaction added
  END IF;
END;
$$;

-- Convenience function to toggle reaction with emoji string
CREATE OR REPLACE FUNCTION toggle_reaction_simple(
  p_user_id text,
  p_owner_type text,
  p_owner_id text,
  p_emoji_value text,
  p_emoji_name text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  emoji_json jsonb;
BEGIN
  -- Create emoji JSON
  emoji_json := jsonb_build_object(
    'type', 'unicode',
    'value', p_emoji_value,
    'name', COALESCE(p_emoji_name, p_emoji_value)
  );
  
  RETURN toggle_reaction(p_user_id, p_owner_type, p_owner_id, emoji_json);
END;
$$;


-- Function to get reaction summary for an item
CREATE OR REPLACE FUNCTION get_reaction_summary(
  p_owner_type text,
  p_owner_id text
)
RETURNS TABLE(
  emoji jsonb,
  emoji_display text,
  emoji_name text,
  emoji_type text,
  count bigint,
  user_names text[],
  user_ids text[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rc.emoji,
    rc.emoji_display,
    rc.emoji_name,
    rc.emoji_type,
    rc.count,
    rc.user_names,
    rc.user_ids
  FROM reaction_counts rc
  WHERE rc.owner_type = p_owner_type 
  AND rc.owner_id = p_owner_id
  ORDER BY rc.count DESC, rc.emoji_display;
END;
$$;

-- Function to check if user has reacted with specific emoji
CREATE OR REPLACE FUNCTION user_has_reaction(
  p_user_id text,
  p_owner_type text,
  p_owner_id text,
  p_emoji jsonb
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if reaction exists
  RETURN EXISTS(
    SELECT 1 FROM reactions 
    WHERE user_id = p_user_id 
    AND owner_type = p_owner_type 
    AND owner_id = p_owner_id 
    AND emoji = p_emoji
  );
END;
$$;

-- ========================
-- TRIGGERS FOR CACHE INVALIDATION
-- ========================
-- You might want to add triggers here to update counters in your main tables
-- or invalidate caches when reactions change

-- Example trigger to update a reaction_count column in messages table
-- (Uncomment and modify if you want to denormalize reaction counts)
/*
CREATE OR REPLACE FUNCTION update_reaction_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update reaction count based on reactable_type
    CASE NEW.reactable_type
      WHEN 'message' THEN
        UPDATE messages 
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{reaction_count}',
          to_jsonb(COALESCE((metadata->>'reaction_count')::int, 0) + 1)
        )
        WHERE id = NEW.reactable_id;
      WHEN 'post' THEN
        UPDATE group_posts 
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{reaction_count}',
          to_jsonb(COALESCE((metadata->>'reaction_count')::int, 0) + 1)
        )
        WHERE id = NEW.reactable_id;
      WHEN 'moment' THEN
        UPDATE moments 
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{reaction_count}',
          to_jsonb(COALESCE((metadata->>'reaction_count')::int, 0) + 1)
        )
        WHERE id = NEW.reactable_id;
    END CASE;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrease reaction count based on reactable_type
    CASE OLD.reactable_type
      WHEN 'message' THEN
        UPDATE messages 
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{reaction_count}',
          to_jsonb(GREATEST(COALESCE((metadata->>'reaction_count')::int, 0) - 1, 0))
        )
        WHERE id = OLD.reactable_id;
      WHEN 'post' THEN
        UPDATE group_posts 
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{reaction_count}',
          to_jsonb(GREATEST(COALESCE((metadata->>'reaction_count')::int, 0) - 1, 0))
        )
        WHERE id = OLD.reactable_id;
      WHEN 'moment' THEN
        UPDATE moments 
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{reaction_count}',
          to_jsonb(GREATEST(COALESCE((metadata->>'reaction_count')::int, 0) - 1, 0))
        )
        WHERE id = OLD.reactable_id;
    END CASE;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_reaction_count
  AFTER INSERT OR DELETE ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_reaction_count();
*/

-- ========================
-- EXAMPLE QUERIES
-- ========================

-- Get all reactions for a specific message
-- SELECT * FROM get_reaction_summary('message', 'msg_abc123');

-- Toggle a Unicode emoji reaction (simple)
-- SELECT toggle_reaction_simple('usr_xyz789', 'message', 'msg_abc123', '👍', 'thumbs_up');


-- Toggle a reaction with full JSON control
-- SELECT toggle_reaction('usr_xyz789', 'message', 'msg_abc123', '{"type": "unicode", "value": "❤️", "name": "heart"}');

-- Check if user has reacted with specific emoji
-- SELECT user_has_reaction('usr_xyz789', 'post', 'pst_def456', '{"type": "unicode", "value": "👍", "name": "thumbs_up"}');

-- Get all reactions by a user
-- SELECT * FROM user_reactions WHERE user_id = 'usr_xyz789';

-- Get top reacted messages
-- SELECT 
--   owner_id as message_id,
--   SUM(count) as total_reactions
-- FROM reaction_counts 
-- WHERE owner_type = 'message'
-- GROUP BY owner_id
-- ORDER BY total_reactions DESC
-- LIMIT 10;


-- Get all Unicode emoji reactions
-- SELECT 
--   emoji->>'value' as emoji_char,
--   COUNT(*) as usage_count
-- FROM reactions 
-- WHERE emoji->>'type' = 'unicode'
-- GROUP BY emoji->>'value'
-- ORDER BY usage_count DESC;
