-- ========================
-- FRIENDSHIPS (many-to-many)
-- ========================
CREATE TABLE IF NOT EXISTS friends (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('frn_'),
  requester_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  addressee_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'blocked')) NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_requester_id ON friends (requester_id);
CREATE INDEX IF NOT EXISTS idx_friends_addressee_id ON friends (addressee_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends (status);

-- ========================
-- CONVERSATIONS
-- ========================
CREATE TABLE IF NOT EXISTS chats (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('cht_'),
  started_by text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_chats_started_by ON chats (started_by);

-- ========================
-- CHAT MEMBERS (many-to-many)
-- ========================
CREATE TABLE IF NOT EXISTS chat_members (
  chat_id text REFERENCES chats (id) ON DELETE CASCADE NOT NULL,
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_member_id ON chat_members (member_id);

-- ========================
-- MESSAGES
-- ========================
CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('msg_'),
  chat_id text REFERENCES chats (id) ON DELETE CASCADE NOT NULL,
  sender_id text REFERENCES members (id) ON DELETE SET NULL,
  content text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  read_by text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_created_at
  ON messages (chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);
  
-- ========================
-- GROUPS
-- ========================
CREATE TABLE IF NOT EXISTS groups (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('grp_'),
  name text NOT NULL,
  description text,
  owner_id text REFERENCES vendors (id) ON DELETE CASCADE NOT NULL,
  cover_image text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON groups (owner_id);

-- ========================
-- GROUP MEMBERS (many-to-many)
-- ========================
CREATE TABLE IF NOT EXISTS group_members (
  group_id text REFERENCES groups (id) ON DELETE CASCADE NOT NULL,
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_member_id ON group_members (member_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members (role);

-- ========================
-- GROUP POSTS
-- ========================
CREATE TABLE IF NOT EXISTS group_posts (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('pst_'),
  group_id text REFERENCES groups (id) ON DELETE CASCADE NOT NULL,
  author_id text REFERENCES members (id) ON DELETE SET NULL,
  content text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_group_posts_group_created_at
  ON group_posts (group_id, created_at);
CREATE INDEX IF NOT EXISTS idx_group_posts_author_id ON group_posts (author_id);

-- ========================
-- POST COMMENTS
-- ========================
CREATE TABLE IF NOT EXISTS post_comments (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('cmt_'),
  post_id text REFERENCES group_posts (id) ON DELETE CASCADE NOT NULL,
  author_id text REFERENCES members (id) ON DELETE SET NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_created_at
  ON post_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_author_id ON post_comments (author_id);

-- ========================
-- MEMORIES (social moments)
-- ========================
CREATE TABLE IF NOT EXISTS memories (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('mem_'),
  title text NOT NULL,
  description text,
  author_id text REFERENCES members (id) ON DELETE SET NULL,
  location_id text REFERENCES locations (id) ON DELETE SET NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  tags text[] DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_memories_author_created_at
  ON memories (author_id, created_at);
CREATE INDEX IF NOT EXISTS idx_memories_location_created_at
  ON memories (location_id, created_at);
CREATE INDEX IF NOT EXISTS idx_memories_is_public ON memories (is_public);
CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN (tags);

-- ========================
-- MEMORY COMMENTS
-- ========================
CREATE TABLE IF NOT EXISTS memory_comments (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('mcm_'),
  memory_id text REFERENCES memories (id) ON DELETE CASCADE NOT NULL,
  author_id text REFERENCES members (id) ON DELETE SET NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_memory_comments_memory_created_at
  ON memory_comments (memory_id, created_at);
CREATE INDEX IF NOT EXISTS idx_memory_comments_author_id ON memory_comments (author_id);

-- ========================
-- MEMORY LIKES
-- ========================
CREATE TABLE IF NOT EXISTS memory_likes (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('mlk_'),
  memory_id text REFERENCES memories (id) ON DELETE CASCADE NOT NULL,
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (memory_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_likes_memory_id ON memory_likes (memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_likes_member_id ON memory_likes (member_id);

