CREATE TYPE AIBotStatus AS ENUM ('Draft', 'Active', 'Pause');
CREATE TYPE MessageRole AS ENUM ('user', 'assistant', 'staff');

CREATE TABLE IF NOT EXISTS ai (
    id serial PRIMARY KEY,
    prompt text NOT NULL DEFAULT '',
    location_id bigint NOT NULL,
    temperature float NOT NULL DEFAULT 0,
    model text NOT NULL,
    status AIBotStatus NOT NULL DEFAULT 'Draft',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    CONSTRAINT ai_location_id_fk FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_personas (
    id serial PRIMARY KEY,
    location_id bigint NOT NULL,
    name text NOT NULL,
    image text,
    response_details text NOT NULL DEFAULT '',
    personality text[] DEFAULT ARRAY[]::text[],
    bot_id bigint REFERENCES ai(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    CONSTRAINT ai_personas_location_id_fk FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    CONSTRAINT ai_personas_bot_id_unique UNIQUE(bot_id)
);

CREATE TABLE IF NOT EXISTS ai_scenarios (
    id serial PRIMARY KEY, -- Added id as primary key
    name text NOT NULL,
    bot_id bigint NOT NULL REFERENCES ai(id) ON DELETE CASCADE,
    workflow_id bigint NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    trigger text NOT NULL,
    examples text[] NOT NULL DEFAULT '{}',
    requirements text[] NOT NULL DEFAULT '{}',
    created_at timestamp with time zone NOT NULL DEFAULT now(), -- Added timestamps
    updated_at timestamp with time zone,
    CONSTRAINT ai_scenarios_bot_id_workflow_id_unique UNIQUE(bot_id, workflow_id)
);

CREATE TABLE IF NOT EXISTS ai_conversations (
    id serial PRIMARY KEY,
    location_id bigint NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    member_id bigint NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    bot_id bigint NOT NULL REFERENCES ai(id) ON DELETE CASCADE,
    stopped boolean NOT NULL DEFAULT false,
    stopped_reason text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    UNIQUE(location_id, member_id, bot_id)
);

CREATE TABLE IF NOT EXISTS ai_messages (
    id serial PRIMARY KEY,
    conversation_id bigint NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role MessageRole NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT ai_messages_conversation_id_fk FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS bot_logs (
    id serial PRIMARY KEY,
    conversation_id bigint NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    message_id int NOT NULL,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT bot_logs_conversation_id_fk FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);