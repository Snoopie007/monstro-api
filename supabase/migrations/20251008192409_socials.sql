
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
-- GROUPS
-- ========================
CREATE TABLE IF NOT EXISTS groups (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  name text NOT NULL,
  description text,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  cover_image text,
  type text CHECK (type IN ('public', 'private')) NOT NULL DEFAULT 'public',
  handle text UNIQUE NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

-- ========================
-- CONVERSATIONS
-- ========================
CREATE TABLE IF NOT EXISTS chats (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  type text CHECK (type IN ('private', 'group')) NOT NULL DEFAULT 'private',
  name text NOT NULL DEFAULT 'New Chat',
  started_by text REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  group_id text REFERENCES groups (id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_chats_started_by ON chats (started_by);
CREATE INDEX IF NOT EXISTS idx_chats_location_id ON chats (location_id);

-- ========================
-- CHAT MEMBERS (many-to-many)
-- ========================
CREATE TABLE IF NOT EXISTS chat_members (
  chat_id text REFERENCES chats (id) ON DELETE CASCADE NOT NULL,
  user_id text REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members (user_id);

-- ========================
-- MESSAGES
-- ========================
CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('msg_'),
  chat_id text REFERENCES chats (id) ON DELETE CASCADE NOT NULL,
  sender_id text REFERENCES users (id) ON DELETE SET NULL,
  content text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);
  


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
  author_id text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  pinned boolean NOT NULL DEFAULT false,
  comment_counts integer NOT NULL DEFAULT 0,
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
  owner_id text NOT NULL,
  owner_type text CHECK (owner_type IN ('post', 'message', 'moment')) NOT NULL,
  parent_id text REFERENCES comments (id) ON DELETE SET NULL,
  like_counts integer NOT NULL DEFAULT 0,
  pinned boolean NOT NULL DEFAULT false,
  user_id text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  content text NOT NULL,
  depth integer NOT NULL DEFAULT 0,
  reply_counts integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_on timestamp with time zone,
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
CREATE TABLE IF NOT EXISTS moments (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  content text,
  user_id text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  like_counts integer NOT NULL DEFAULT 0,
  comment_counts integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);



-- ========================
-- MEMORY LIKES
-- ========================
CREATE TABLE IF NOT EXISTS moment_likes (
  moment_id text REFERENCES moments (id) ON DELETE CASCADE NOT NULL,
  user_id text REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (moment_id, user_id)
);




-- ========================
-- POLYMORPHIC MEDIA TABLE
-- ========================
CREATE TABLE IF NOT EXISTS media (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  owner_id text NOT NULL,
  owner_type text CHECK (owner_type IN ('post', 'message', 'moment')) NOT NULL,
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

-- Create table
CREATE TABLE user_feeds (
    id TEXT PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
    user_id TEXT NOT NULL,
    moment_id TEXT,
    post_id TEXT,
    author_id TEXT NOT NULL,
    group_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE
);

-- Add foreign keys
ALTER TABLE user_feeds 
    ADD CONSTRAINT fk_user_feeds_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_feeds 
    ADD CONSTRAINT fk_user_feeds_moment 
    FOREIGN KEY (moment_id) REFERENCES moments(id) ON DELETE CASCADE;

ALTER TABLE user_feeds 
    ADD CONSTRAINT fk_user_feeds_post 
    FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE;

ALTER TABLE user_feeds 
    ADD CONSTRAINT fk_user_feeds_author 
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_feeds 
    ADD CONSTRAINT fk_user_feeds_group 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Add check constraint
ALTER TABLE user_feeds 
    ADD CONSTRAINT check_feed_item 
    CHECK (
        (moment_id IS NOT NULL AND post_id IS NULL) OR 
        (moment_id IS NULL AND post_id IS NOT NULL)
    );

-- Add unique constraint
ALTER TABLE user_feeds 
    ADD CONSTRAINT unique_user_feed_item 
    UNIQUE (user_id, moment_id, post_id);

-- Add indexes
CREATE INDEX idx_user_feeds_user_created ON user_feeds(user_id, created_at DESC);
CREATE INDEX idx_user_feeds_author ON user_feeds(author_id);
CREATE INDEX idx_user_feeds_moment ON user_feeds(moment_id) WHERE moment_id IS NOT NULL;
CREATE INDEX idx_user_feeds_post ON user_feeds(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_user_feeds_group ON user_feeds(group_id) WHERE group_id IS NOT NULL;