
CREATE TYPE GROUP_TYPE AS ENUM('public', 'private');


-- ========================
-- FRIENDSHIPS (many-to-many)
-- ========================
CREATE TABLE IF NOT EXISTS friends (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
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
  type CHAT_TYPE NOT NULL DEFAULT 'private',
  name text,
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
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);
  
-- ========================
-- GROUPS
-- ========================
CREATE TABLE IF NOT EXISTS groups (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('grp_'),
  name text NOT NULL,
  description text,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  cover_image text,
  type group_type NOT NULL DEFAULT 'public',
  handle text UNIQUE NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

-- ========================
-- GROUP MEMBERS (many-to-many)
-- ========================
CREATE TABLE IF NOT EXISTS group_members (
  group_id text REFERENCES groups (id) ON DELETE CASCADE NOT NULL,
  user_id text REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members (role);

-- ========================
-- GROUP POSTS
-- ========================
CREATE TABLE IF NOT EXISTS group_posts (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('pst_'),
  group_id text REFERENCES groups (id) ON DELETE CASCADE NOT NULL,
  user_id text REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  status text CHECK (status IN ('draft', 'published', 'archived')) NOT NULL DEFAULT 'draft',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

-- ========================
-- POST COMMENTS
-- ========================
CREATE TABLE IF NOT EXISTS comments (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  owner_type OWNER_TYPE NOT NULL,
  owner_id text NOT NULL,
  user_id text REFERENCES users (id) ON DELETE SET NULL,
  content text NOT NULL,
  likes integer NOT NULL DEFAULT 0,
  pinned boolean NOT NULL DEFAULT false,
  parent_id text REFERENCES comments (id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

-- Indexes for comments table
CREATE INDEX IF NOT EXISTS idx_comments_owner ON comments (owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_comments_owner_type ON comments (owner_type);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments (created_at);




-- ========================
-- MEMORIES (social moments) Later
-- ========================
CREATE TABLE IF NOT EXISTS memories (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('mem_'),
  content text,
  member_id text REFERENCES members (id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);



-- ========================
-- MEMORY LIKES
-- ========================
CREATE TABLE IF NOT EXISTS memory_likes (
  memory_id text REFERENCES memories (id) ON DELETE CASCADE NOT NULL,
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (memory_id, member_id)
);




-- ========================
-- POLYMORPHIC MEDIA TABLE
-- ========================
CREATE TABLE IF NOT EXISTS media (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('med_'),
  owner_id text NOT NULL,
  owner_type text CHECK (owner_type IN ('post', 'message', 'memory')) NOT NULL,
  file_name text NOT NULL,
  file_type text CHECK (file_type IN ('image', 'video', 'audio', 'document', 'other')) NOT NULL,
  file_size bigint,
  mime_type text,
  url text NOT NULL,
  thumbnail_url text,
  alt_text text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_media_owner ON media (owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_media_owner_type ON media (owner_type);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media (created_at);

