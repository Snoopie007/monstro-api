create extension if not exists "pgjwt" with schema "extensions";

create extension if not exists "vector" with schema "extensions";


create type "public"."bot_model" as enum ('anthropic', 'gpt', 'gemini');

create type "public"."bot_status" as enum ('Draft', 'Active', 'Paused');

create type "public"."channel" as enum ('WebChat', 'Email', 'System');

create type "public"."document_type" as enum ('file', 'website');

create type "public"."message_role" as enum ('user', 'ai', 'vendor', 'system', 'tool', 'tool_response');

create type "public"."ticket_status" as enum ('open', 'in_progress', 'resolved', 'closed');

create type "public"."trigger_type" as enum ('keyword', 'intent', 'condition');

create table "public"."support_bot_personas" (
    "id" text not null default uuid_base62(),
    "support_bot_id" text not null,
    "name" text not null,
    "image" text,
    "response_style" text not null default ''::text,
    "personality_traits" text[] not null default '{}'::text[],
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone
);


create table "public"."support_bots" (
    "id" text not null default uuid_base62(),
    "location_id" text not null,
    "name" text not null default 'Support Bot'::text,
    "prompt" text not null default 'You are a helpful customer support assistant.'::text,
    "temperature" integer not null default 0,
    "initial_message" text not null default 'Hi! I''m here to help you. What can I assist you with today?'::text,
    "model" bot_model not null default 'gpt'::bot_model,
    "status" bot_status not null default 'Draft'::bot_status,
    "available_tools" jsonb[] not null default '{}'::jsonb[],
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone
);


create table "public"."support_conversations" (
    "id" text not null default uuid_base62(),
    "support_bot_id" text not null,
    "member_id" text not null,
    "vendor_id" text,
    "taken_over_at" timestamp with time zone,
    "is_vendor_active" boolean default false,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone
);


create table "public"."support_document_chunks" (
    "id" text not null default uuid_base62(),
    "document_id" text,
    "content" text not null,
    "embedding" vector(384)
);


create table "public"."support_documents" (
    "id" text not null default uuid_base62(),
    "support_bot_id" text not null,
    "name" text not null,
    "file_path" text,
    "url" text,
    "type" document_type not null,
    "size" integer,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."support_logs" (
    "id" text not null default uuid_base62(),
    "support_bot_id" text not null,
    "conversation_id" text,
    "action" text not null,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."support_messages" (
    "id" text not null default uuid_base62(),
    "conversation_id" text not null,
    "content" text not null,
    "role" message_role not null,
    "channel" channel not null default 'WebChat'::channel,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."support_tickets" (
    "id" text not null default uuid_base62(),
    "conversation_id" text not null,
    "title" text not null default 'Support Request'::text,
    "description" text,
    "status" ticket_status not null default 'open'::ticket_status,
    "priority" integer default 3,
    "assigned_to" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone,
    "metadata" jsonb default '{}'::jsonb
);


create table "public"."support_triggers" (
    "id" text not null default uuid_base62(),
    "support_bot_id" text not null,
    "name" text not null,
    "trigger_type" trigger_type not null default 'keyword'::trigger_type,
    "trigger_phrases" text[] not null default '{}'::text[],
    "tool_call" jsonb not null,
    "examples" text[] not null default '{}'::text[],
    "requirements" text[] not null default '{}'::text[],
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone
);


create table "public"."tickets" (
    "id" text not null default uuid_base62(),
    "conversation_id" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone,
    "metadata" jsonb default '{}'::jsonb
);


alter table "public"."member_locations" add column "bot_metadata" jsonb default '{}'::jsonb;

alter table "public"."member_locations" add column "last_bot_interaction" timestamp with time zone;

alter table "public"."member_locations" add column "last_support_interaction" timestamp with time zone;

alter table "public"."member_locations" add column "support_bot_metadata" jsonb default '{}'::jsonb;

CREATE INDEX idx_support_bots_location_id ON public.support_bots USING btree (location_id);

CREATE INDEX idx_support_conversations_bot_id ON public.support_conversations USING btree (support_bot_id);

CREATE INDEX idx_support_conversations_member_id ON public.support_conversations USING btree (member_id);

CREATE INDEX idx_support_document_chunks_document_id ON public.support_document_chunks USING btree (document_id);

CREATE INDEX idx_support_documents_bot_id ON public.support_documents USING btree (support_bot_id);

CREATE INDEX idx_support_logs_bot_id ON public.support_logs USING btree (support_bot_id);

CREATE INDEX idx_support_messages_conversation_id ON public.support_messages USING btree (conversation_id);

CREATE INDEX idx_support_tickets_conversation_id ON public.support_tickets USING btree (conversation_id);

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);

CREATE INDEX idx_support_triggers_active ON public.support_triggers USING btree (is_active);

CREATE INDEX idx_support_triggers_bot_id ON public.support_triggers USING btree (support_bot_id);

CREATE INDEX idx_tickets_conversation_id ON public.tickets USING btree (conversation_id);

CREATE INDEX idx_tickets_created_at ON public.tickets USING btree (created_at);

CREATE UNIQUE INDEX support_bot_personas_pkey ON public.support_bot_personas USING btree (id);

CREATE UNIQUE INDEX support_bot_personas_support_bot_id_key ON public.support_bot_personas USING btree (support_bot_id);

CREATE UNIQUE INDEX support_bots_location_id_key ON public.support_bots USING btree (location_id);

CREATE UNIQUE INDEX support_bots_pkey ON public.support_bots USING btree (id);

CREATE UNIQUE INDEX support_conversations_pkey ON public.support_conversations USING btree (id);

CREATE INDEX support_document_chunks_embedding_idx ON public.support_document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');

CREATE UNIQUE INDEX support_document_chunks_pkey ON public.support_document_chunks USING btree (id);

CREATE UNIQUE INDEX support_documents_pkey ON public.support_documents USING btree (id);

CREATE UNIQUE INDEX support_logs_pkey ON public.support_logs USING btree (id);

CREATE UNIQUE INDEX support_messages_pkey ON public.support_messages USING btree (id);

CREATE UNIQUE INDEX support_tickets_pkey ON public.support_tickets USING btree (id);

CREATE UNIQUE INDEX support_triggers_pkey ON public.support_triggers USING btree (id);

CREATE UNIQUE INDEX tickets_pkey ON public.tickets USING btree (id);

alter table "public"."support_bot_personas" add constraint "support_bot_personas_pkey" PRIMARY KEY using index "support_bot_personas_pkey";

alter table "public"."support_bots" add constraint "support_bots_pkey" PRIMARY KEY using index "support_bots_pkey";

alter table "public"."support_conversations" add constraint "support_conversations_pkey" PRIMARY KEY using index "support_conversations_pkey";

alter table "public"."support_document_chunks" add constraint "support_document_chunks_pkey" PRIMARY KEY using index "support_document_chunks_pkey";

alter table "public"."support_documents" add constraint "support_documents_pkey" PRIMARY KEY using index "support_documents_pkey";

alter table "public"."support_logs" add constraint "support_logs_pkey" PRIMARY KEY using index "support_logs_pkey";

alter table "public"."support_messages" add constraint "support_messages_pkey" PRIMARY KEY using index "support_messages_pkey";

alter table "public"."support_tickets" add constraint "support_tickets_pkey" PRIMARY KEY using index "support_tickets_pkey";

alter table "public"."support_triggers" add constraint "support_triggers_pkey" PRIMARY KEY using index "support_triggers_pkey";

alter table "public"."tickets" add constraint "tickets_pkey" PRIMARY KEY using index "tickets_pkey";

alter table "public"."support_bot_personas" add constraint "support_bot_personas_support_bot_id_fkey" FOREIGN KEY (support_bot_id) REFERENCES support_bots(id) ON DELETE CASCADE not valid;

alter table "public"."support_bot_personas" validate constraint "support_bot_personas_support_bot_id_fkey";

alter table "public"."support_bot_personas" add constraint "support_bot_personas_support_bot_id_key" UNIQUE using index "support_bot_personas_support_bot_id_key";

alter table "public"."support_bots" add constraint "support_bots_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE not valid;

alter table "public"."support_bots" validate constraint "support_bots_location_id_fkey";

alter table "public"."support_bots" add constraint "support_bots_location_id_key" UNIQUE using index "support_bots_location_id_key";

alter table "public"."support_conversations" add constraint "support_conversations_member_id_fkey" FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE not valid;

alter table "public"."support_conversations" validate constraint "support_conversations_member_id_fkey";

alter table "public"."support_conversations" add constraint "support_conversations_support_bot_id_fkey" FOREIGN KEY (support_bot_id) REFERENCES support_bots(id) ON DELETE CASCADE not valid;

alter table "public"."support_conversations" validate constraint "support_conversations_support_bot_id_fkey";

alter table "public"."support_conversations" add constraint "support_conversations_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."support_conversations" validate constraint "support_conversations_vendor_id_fkey";

alter table "public"."support_document_chunks" add constraint "support_document_chunks_document_id_fkey" FOREIGN KEY (document_id) REFERENCES support_documents(id) ON DELETE CASCADE not valid;

alter table "public"."support_document_chunks" validate constraint "support_document_chunks_document_id_fkey";

alter table "public"."support_documents" add constraint "support_documents_support_bot_id_fkey" FOREIGN KEY (support_bot_id) REFERENCES support_bots(id) ON DELETE CASCADE not valid;

alter table "public"."support_documents" validate constraint "support_documents_support_bot_id_fkey";

alter table "public"."support_logs" add constraint "support_logs_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES support_conversations(id) ON DELETE CASCADE not valid;

alter table "public"."support_logs" validate constraint "support_logs_conversation_id_fkey";

alter table "public"."support_logs" add constraint "support_logs_support_bot_id_fkey" FOREIGN KEY (support_bot_id) REFERENCES support_bots(id) ON DELETE CASCADE not valid;

alter table "public"."support_logs" validate constraint "support_logs_support_bot_id_fkey";

alter table "public"."support_messages" add constraint "support_messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES support_conversations(id) ON DELETE CASCADE not valid;

alter table "public"."support_messages" validate constraint "support_messages_conversation_id_fkey";

alter table "public"."support_tickets" add constraint "support_tickets_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."support_tickets" validate constraint "support_tickets_assigned_to_fkey";

alter table "public"."support_tickets" add constraint "support_tickets_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES support_conversations(id) ON DELETE CASCADE not valid;

alter table "public"."support_tickets" validate constraint "support_tickets_conversation_id_fkey";

alter table "public"."support_triggers" add constraint "support_triggers_support_bot_id_fkey" FOREIGN KEY (support_bot_id) REFERENCES support_bots(id) ON DELETE CASCADE not valid;

alter table "public"."support_triggers" validate constraint "support_triggers_support_bot_id_fkey";

grant delete on table "public"."support_bot_personas" to "anon";

grant insert on table "public"."support_bot_personas" to "anon";

grant references on table "public"."support_bot_personas" to "anon";

grant select on table "public"."support_bot_personas" to "anon";

grant trigger on table "public"."support_bot_personas" to "anon";

grant truncate on table "public"."support_bot_personas" to "anon";

grant update on table "public"."support_bot_personas" to "anon";

grant delete on table "public"."support_bot_personas" to "authenticated";

grant insert on table "public"."support_bot_personas" to "authenticated";

grant references on table "public"."support_bot_personas" to "authenticated";

grant select on table "public"."support_bot_personas" to "authenticated";

grant trigger on table "public"."support_bot_personas" to "authenticated";

grant truncate on table "public"."support_bot_personas" to "authenticated";

grant update on table "public"."support_bot_personas" to "authenticated";

grant delete on table "public"."support_bot_personas" to "service_role";

grant insert on table "public"."support_bot_personas" to "service_role";

grant references on table "public"."support_bot_personas" to "service_role";

grant select on table "public"."support_bot_personas" to "service_role";

grant trigger on table "public"."support_bot_personas" to "service_role";

grant truncate on table "public"."support_bot_personas" to "service_role";

grant update on table "public"."support_bot_personas" to "service_role";

grant delete on table "public"."support_bots" to "anon";

grant insert on table "public"."support_bots" to "anon";

grant references on table "public"."support_bots" to "anon";

grant select on table "public"."support_bots" to "anon";

grant trigger on table "public"."support_bots" to "anon";

grant truncate on table "public"."support_bots" to "anon";

grant update on table "public"."support_bots" to "anon";

grant delete on table "public"."support_bots" to "authenticated";

grant insert on table "public"."support_bots" to "authenticated";

grant references on table "public"."support_bots" to "authenticated";

grant select on table "public"."support_bots" to "authenticated";

grant trigger on table "public"."support_bots" to "authenticated";

grant truncate on table "public"."support_bots" to "authenticated";

grant update on table "public"."support_bots" to "authenticated";

grant delete on table "public"."support_bots" to "service_role";

grant insert on table "public"."support_bots" to "service_role";

grant references on table "public"."support_bots" to "service_role";

grant select on table "public"."support_bots" to "service_role";

grant trigger on table "public"."support_bots" to "service_role";

grant truncate on table "public"."support_bots" to "service_role";

grant update on table "public"."support_bots" to "service_role";

grant delete on table "public"."support_conversations" to "anon";

grant insert on table "public"."support_conversations" to "anon";

grant references on table "public"."support_conversations" to "anon";

grant select on table "public"."support_conversations" to "anon";

grant trigger on table "public"."support_conversations" to "anon";

grant truncate on table "public"."support_conversations" to "anon";

grant update on table "public"."support_conversations" to "anon";

grant delete on table "public"."support_conversations" to "authenticated";

grant insert on table "public"."support_conversations" to "authenticated";

grant references on table "public"."support_conversations" to "authenticated";

grant select on table "public"."support_conversations" to "authenticated";

grant trigger on table "public"."support_conversations" to "authenticated";

grant truncate on table "public"."support_conversations" to "authenticated";

grant update on table "public"."support_conversations" to "authenticated";

grant delete on table "public"."support_conversations" to "service_role";

grant insert on table "public"."support_conversations" to "service_role";

grant references on table "public"."support_conversations" to "service_role";

grant select on table "public"."support_conversations" to "service_role";

grant trigger on table "public"."support_conversations" to "service_role";

grant truncate on table "public"."support_conversations" to "service_role";

grant update on table "public"."support_conversations" to "service_role";

grant delete on table "public"."support_document_chunks" to "anon";

grant insert on table "public"."support_document_chunks" to "anon";

grant references on table "public"."support_document_chunks" to "anon";

grant select on table "public"."support_document_chunks" to "anon";

grant trigger on table "public"."support_document_chunks" to "anon";

grant truncate on table "public"."support_document_chunks" to "anon";

grant update on table "public"."support_document_chunks" to "anon";

grant delete on table "public"."support_document_chunks" to "authenticated";

grant insert on table "public"."support_document_chunks" to "authenticated";

grant references on table "public"."support_document_chunks" to "authenticated";

grant select on table "public"."support_document_chunks" to "authenticated";

grant trigger on table "public"."support_document_chunks" to "authenticated";

grant truncate on table "public"."support_document_chunks" to "authenticated";

grant update on table "public"."support_document_chunks" to "authenticated";

grant delete on table "public"."support_document_chunks" to "service_role";

grant insert on table "public"."support_document_chunks" to "service_role";

grant references on table "public"."support_document_chunks" to "service_role";

grant select on table "public"."support_document_chunks" to "service_role";

grant trigger on table "public"."support_document_chunks" to "service_role";

grant truncate on table "public"."support_document_chunks" to "service_role";

grant update on table "public"."support_document_chunks" to "service_role";

grant delete on table "public"."support_documents" to "anon";

grant insert on table "public"."support_documents" to "anon";

grant references on table "public"."support_documents" to "anon";

grant select on table "public"."support_documents" to "anon";

grant trigger on table "public"."support_documents" to "anon";

grant truncate on table "public"."support_documents" to "anon";

grant update on table "public"."support_documents" to "anon";

grant delete on table "public"."support_documents" to "authenticated";

grant insert on table "public"."support_documents" to "authenticated";

grant references on table "public"."support_documents" to "authenticated";

grant select on table "public"."support_documents" to "authenticated";

grant trigger on table "public"."support_documents" to "authenticated";

grant truncate on table "public"."support_documents" to "authenticated";

grant update on table "public"."support_documents" to "authenticated";

grant delete on table "public"."support_documents" to "service_role";

grant insert on table "public"."support_documents" to "service_role";

grant references on table "public"."support_documents" to "service_role";

grant select on table "public"."support_documents" to "service_role";

grant trigger on table "public"."support_documents" to "service_role";

grant truncate on table "public"."support_documents" to "service_role";

grant update on table "public"."support_documents" to "service_role";

grant delete on table "public"."support_logs" to "anon";

grant insert on table "public"."support_logs" to "anon";

grant references on table "public"."support_logs" to "anon";

grant select on table "public"."support_logs" to "anon";

grant trigger on table "public"."support_logs" to "anon";

grant truncate on table "public"."support_logs" to "anon";

grant update on table "public"."support_logs" to "anon";

grant delete on table "public"."support_logs" to "authenticated";

grant insert on table "public"."support_logs" to "authenticated";

grant references on table "public"."support_logs" to "authenticated";

grant select on table "public"."support_logs" to "authenticated";

grant trigger on table "public"."support_logs" to "authenticated";

grant truncate on table "public"."support_logs" to "authenticated";

grant update on table "public"."support_logs" to "authenticated";

grant delete on table "public"."support_logs" to "service_role";

grant insert on table "public"."support_logs" to "service_role";

grant references on table "public"."support_logs" to "service_role";

grant select on table "public"."support_logs" to "service_role";

grant trigger on table "public"."support_logs" to "service_role";

grant truncate on table "public"."support_logs" to "service_role";

grant update on table "public"."support_logs" to "service_role";

grant delete on table "public"."support_messages" to "anon";

grant insert on table "public"."support_messages" to "anon";

grant references on table "public"."support_messages" to "anon";

grant select on table "public"."support_messages" to "anon";

grant trigger on table "public"."support_messages" to "anon";

grant truncate on table "public"."support_messages" to "anon";

grant update on table "public"."support_messages" to "anon";

grant delete on table "public"."support_messages" to "authenticated";

grant insert on table "public"."support_messages" to "authenticated";

grant references on table "public"."support_messages" to "authenticated";

grant select on table "public"."support_messages" to "authenticated";

grant trigger on table "public"."support_messages" to "authenticated";

grant truncate on table "public"."support_messages" to "authenticated";

grant update on table "public"."support_messages" to "authenticated";

grant delete on table "public"."support_messages" to "service_role";

grant insert on table "public"."support_messages" to "service_role";

grant references on table "public"."support_messages" to "service_role";

grant select on table "public"."support_messages" to "service_role";

grant trigger on table "public"."support_messages" to "service_role";

grant truncate on table "public"."support_messages" to "service_role";

grant update on table "public"."support_messages" to "service_role";

grant delete on table "public"."support_tickets" to "anon";

grant insert on table "public"."support_tickets" to "anon";

grant references on table "public"."support_tickets" to "anon";

grant select on table "public"."support_tickets" to "anon";

grant trigger on table "public"."support_tickets" to "anon";

grant truncate on table "public"."support_tickets" to "anon";

grant update on table "public"."support_tickets" to "anon";

grant delete on table "public"."support_tickets" to "authenticated";

grant insert on table "public"."support_tickets" to "authenticated";

grant references on table "public"."support_tickets" to "authenticated";

grant select on table "public"."support_tickets" to "authenticated";

grant trigger on table "public"."support_tickets" to "authenticated";

grant truncate on table "public"."support_tickets" to "authenticated";

grant update on table "public"."support_tickets" to "authenticated";

grant delete on table "public"."support_tickets" to "service_role";

grant insert on table "public"."support_tickets" to "service_role";

grant references on table "public"."support_tickets" to "service_role";

grant select on table "public"."support_tickets" to "service_role";

grant trigger on table "public"."support_tickets" to "service_role";

grant truncate on table "public"."support_tickets" to "service_role";

grant update on table "public"."support_tickets" to "service_role";

grant delete on table "public"."support_triggers" to "anon";

grant insert on table "public"."support_triggers" to "anon";

grant references on table "public"."support_triggers" to "anon";

grant select on table "public"."support_triggers" to "anon";

grant trigger on table "public"."support_triggers" to "anon";

grant truncate on table "public"."support_triggers" to "anon";

grant update on table "public"."support_triggers" to "anon";

grant delete on table "public"."support_triggers" to "authenticated";

grant insert on table "public"."support_triggers" to "authenticated";

grant references on table "public"."support_triggers" to "authenticated";

grant select on table "public"."support_triggers" to "authenticated";

grant trigger on table "public"."support_triggers" to "authenticated";

grant truncate on table "public"."support_triggers" to "authenticated";

grant update on table "public"."support_triggers" to "authenticated";

grant delete on table "public"."support_triggers" to "service_role";

grant insert on table "public"."support_triggers" to "service_role";

grant references on table "public"."support_triggers" to "service_role";

grant select on table "public"."support_triggers" to "service_role";

grant trigger on table "public"."support_triggers" to "service_role";

grant truncate on table "public"."support_triggers" to "service_role";

grant update on table "public"."support_triggers" to "service_role";

grant delete on table "public"."tickets" to "anon";

grant insert on table "public"."tickets" to "anon";

grant references on table "public"."tickets" to "anon";

grant select on table "public"."tickets" to "anon";

grant trigger on table "public"."tickets" to "anon";

grant truncate on table "public"."tickets" to "anon";

grant update on table "public"."tickets" to "anon";

grant delete on table "public"."tickets" to "authenticated";

grant insert on table "public"."tickets" to "authenticated";

grant references on table "public"."tickets" to "authenticated";

grant select on table "public"."tickets" to "authenticated";

grant trigger on table "public"."tickets" to "authenticated";

grant truncate on table "public"."tickets" to "authenticated";

grant update on table "public"."tickets" to "authenticated";

grant delete on table "public"."tickets" to "service_role";

grant insert on table "public"."tickets" to "service_role";

grant references on table "public"."tickets" to "service_role";

grant select on table "public"."tickets" to "service_role";

grant trigger on table "public"."tickets" to "service_role";

grant truncate on table "public"."tickets" to "service_role";

grant update on table "public"."tickets" to "service_role";


