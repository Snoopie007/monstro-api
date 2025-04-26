CREATE TYPE AIBotStatus as enum ('Draft', 'Active', 'Pause', 'Archived');

CREATE TABLE IF NOT EXISTS ai_bots (
	id serial primary key,
	title text NOT NULL,
	bot_name text NOT NULL,
	description text,
	reason text NOT NULL,
	response_details text NOT NULL,
	location_id bigint NOT NULL,
	personality text ARRAY default ARRAY[]::text[],
	temperature float NOT NULL default 0,
	max_tokens smallint NOT NULL default 0,
	initial_message text,
	model text NOT NULL,
	objectives jsonb ARRAY default NULL,
	invalid_nodes text ARRAY NOT NULL default ARRAY[]::text[],
	status AIBotStatus NOT NULL default AIBotStatus ('Draft'),
	created_at timestamp with time zone NOT NULL default now(),
	updated_at timestamp with time zone
);

ALTER TABLE ai_bots ADD CONSTRAINT ai_bots_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS bot_queues (
	id serial primary key,
	prospect_id text NOT NULL,
	bot_id bigint NOT NULL references ai_bots (id) on delete cascade,
	completed_nodes text ARRAY NOT NULL default ARRAY[]::text[],
	current_node text  NOT NULL default 'start',
	attempts int NOT NULL default 0,
	stopped boolean NOT NULL default false,
	stopped_reason text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
	created_at timestamp with time zone NOT NULL default now(),
	updated_at timestamp with time zone,
	CONSTRAINT bot_queues_prospect_id_unique UNIQUE("prospect_id"),
	CONSTRAINT bot_queues_ai_bots_id_fk FOREIGN KEY ("bot_id") REFERENCES "ai_bots"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS bot_logs (
	id serial primary key,
	queue_id bigint NOT NULL references bot_queues (id) on delete cascade,
	node_id text NOT NULL,
	message_id int NOT NULL,
	type text NOT NULL,
	state jsonb DEFAULT '{}'::jsonb,
	conditions jsonb DEFAULT '{}'::jsonb,
	metadata jsonb DEFAULT '{}'::jsonb,
	response text,
	errors jsonb DEFAULT '{}'::jsonb,
	created_at timestamp with time zone NOT NULL default now(),
	CONSTRAINT bot_logs_queue_id_fk FOREIGN KEY ("queue_id") REFERENCES "bot_queues"("id") ON DELETE cascade
);

