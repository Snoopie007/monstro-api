revoke delete on table "public"."support_bot_personas" from "anon";

revoke insert on table "public"."support_bot_personas" from "anon";

revoke references on table "public"."support_bot_personas" from "anon";

revoke select on table "public"."support_bot_personas" from "anon";

revoke trigger on table "public"."support_bot_personas" from "anon";

revoke truncate on table "public"."support_bot_personas" from "anon";

revoke update on table "public"."support_bot_personas" from "anon";

revoke delete on table "public"."support_bot_personas" from "authenticated";

revoke insert on table "public"."support_bot_personas" from "authenticated";

revoke references on table "public"."support_bot_personas" from "authenticated";

revoke select on table "public"."support_bot_personas" from "authenticated";

revoke trigger on table "public"."support_bot_personas" from "authenticated";

revoke truncate on table "public"."support_bot_personas" from "authenticated";

revoke update on table "public"."support_bot_personas" from "authenticated";

revoke delete on table "public"."support_bot_personas" from "service_role";

revoke insert on table "public"."support_bot_personas" from "service_role";

revoke references on table "public"."support_bot_personas" from "service_role";

revoke select on table "public"."support_bot_personas" from "service_role";

revoke trigger on table "public"."support_bot_personas" from "service_role";

revoke truncate on table "public"."support_bot_personas" from "service_role";

revoke update on table "public"."support_bot_personas" from "service_role";

revoke delete on table "public"."support_bots" from "anon";

revoke insert on table "public"."support_bots" from "anon";

revoke references on table "public"."support_bots" from "anon";

revoke select on table "public"."support_bots" from "anon";

revoke trigger on table "public"."support_bots" from "anon";

revoke truncate on table "public"."support_bots" from "anon";

revoke update on table "public"."support_bots" from "anon";

revoke delete on table "public"."support_bots" from "authenticated";

revoke insert on table "public"."support_bots" from "authenticated";

revoke references on table "public"."support_bots" from "authenticated";

revoke select on table "public"."support_bots" from "authenticated";

revoke trigger on table "public"."support_bots" from "authenticated";

revoke truncate on table "public"."support_bots" from "authenticated";

revoke update on table "public"."support_bots" from "authenticated";

revoke delete on table "public"."support_bots" from "service_role";

revoke insert on table "public"."support_bots" from "service_role";

revoke references on table "public"."support_bots" from "service_role";

revoke select on table "public"."support_bots" from "service_role";

revoke trigger on table "public"."support_bots" from "service_role";

revoke truncate on table "public"."support_bots" from "service_role";

revoke update on table "public"."support_bots" from "service_role";

alter table "public"."support_bot_personas" drop constraint "support_bot_personas_support_bot_id_fkey";

alter table "public"."support_bot_personas" drop constraint "support_bot_personas_support_bot_id_key";

alter table "public"."support_bots" drop constraint "support_bots_location_id_fkey";

alter table "public"."support_bots" drop constraint "support_bots_location_id_key";

alter table "public"."support_conversations" drop constraint "support_conversations_support_bot_id_fkey";

alter table "public"."support_conversations" drop constraint "support_conversations_vendor_id_fkey";

alter table "public"."support_documents" drop constraint "support_documents_support_bot_id_fkey";

alter table "public"."support_logs" drop constraint "support_logs_support_bot_id_fkey";

alter table "public"."support_triggers" drop constraint "support_triggers_support_bot_id_fkey";

alter table "public"."support_bot_personas" drop constraint "support_bot_personas_pkey";

alter table "public"."support_bots" drop constraint "support_bots_pkey";

drop index if exists "public"."support_bot_personas_pkey";

drop index if exists "public"."support_bot_personas_support_bot_id_key";

drop index if exists "public"."idx_support_bots_location_id";

drop index if exists "public"."idx_support_conversations_bot_id";

drop index if exists "public"."idx_support_documents_bot_id";

drop index if exists "public"."idx_support_logs_bot_id";

drop index if exists "public"."support_bots_location_id_key";

drop index if exists "public"."support_bots_pkey";

drop table "public"."support_bot_personas";

drop table "public"."support_bots";


  create table "public"."support_assistants" (
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
    "updated_at" timestamp with time zone,
    "persona" jsonb not null default '{}'::jsonb
      );


alter table "public"."support_conversations" drop column "support_bot_id";

alter table "public"."support_conversations" drop column "title";

alter table "public"."support_conversations" drop column "vendor_id";

alter table "public"."support_conversations" add column "category" text not null default 'General'::text;

alter table "public"."support_conversations" add column "location_id" text not null;

alter table "public"."support_conversations" add column "support_assistant_id" text not null;

alter table "public"."support_documents" drop column "support_bot_id";

alter table "public"."support_documents" add column "support_assistant_id" text not null;

alter table "public"."support_logs" drop column "support_bot_id";

alter table "public"."support_logs" add column "support_assistant_id" text not null;

alter table "public"."support_messages" add column "agent_id" text;

alter table "public"."support_messages" add column "agent_name" text;

CREATE INDEX idx_support_bots_location_id ON public.support_assistants USING btree (location_id);

CREATE INDEX idx_support_conversations_bot_id ON public.support_conversations USING btree (support_assistant_id);

CREATE INDEX idx_support_documents_bot_id ON public.support_documents USING btree (support_assistant_id);

CREATE INDEX idx_support_logs_bot_id ON public.support_logs USING btree (support_assistant_id);

CREATE UNIQUE INDEX support_bots_location_id_key ON public.support_assistants USING btree (location_id);

CREATE UNIQUE INDEX support_bots_pkey ON public.support_assistants USING btree (id);

alter table "public"."support_assistants" add constraint "support_bots_pkey" PRIMARY KEY using index "support_bots_pkey";

alter table "public"."support_assistants" add constraint "support_bots_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE not valid;

alter table "public"."support_assistants" validate constraint "support_bots_location_id_fkey";

alter table "public"."support_assistants" add constraint "support_bots_location_id_key" UNIQUE using index "support_bots_location_id_key";

alter table "public"."support_conversations" add constraint "support_conversations_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE not valid;

alter table "public"."support_conversations" validate constraint "support_conversations_location_id_fkey";

alter table "public"."support_conversations" add constraint "support_conversations_support_assistant_id_fkey" FOREIGN KEY (support_assistant_id) REFERENCES support_assistants(id) ON DELETE CASCADE not valid;

alter table "public"."support_conversations" validate constraint "support_conversations_support_assistant_id_fkey";

alter table "public"."support_documents" add constraint "support_documents_support_assistant_id_fkey" FOREIGN KEY (support_assistant_id) REFERENCES support_assistants(id) ON DELETE CASCADE not valid;

alter table "public"."support_documents" validate constraint "support_documents_support_assistant_id_fkey";

alter table "public"."support_logs" add constraint "support_logs_support_assistant_id_fkey" FOREIGN KEY (support_assistant_id) REFERENCES support_assistants(id) ON DELETE CASCADE not valid;

alter table "public"."support_logs" validate constraint "support_logs_support_assistant_id_fkey";

alter table "public"."support_triggers" add constraint "support_triggers_support_bot_id_fkey" FOREIGN KEY (support_bot_id) REFERENCES support_assistants(id) ON DELETE CASCADE not valid;

alter table "public"."support_triggers" validate constraint "support_triggers_support_bot_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.uuid_base62(prefix text DEFAULT ''::text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    raw UUID := uuid_generate_v4();
    b64 text;
BEGIN
    b64 := encode(uuid_send(raw), 'base64');
    b64 := regexp_replace(b64, '[^a-zA-Z0-9]', '', 'g');
    RETURN prefix || b64;
END;
$function$
;

grant delete on table "public"."support_assistants" to "anon";

grant insert on table "public"."support_assistants" to "anon";

grant references on table "public"."support_assistants" to "anon";

grant select on table "public"."support_assistants" to "anon";

grant trigger on table "public"."support_assistants" to "anon";

grant truncate on table "public"."support_assistants" to "anon";

grant update on table "public"."support_assistants" to "anon";

grant delete on table "public"."support_assistants" to "authenticated";

grant insert on table "public"."support_assistants" to "authenticated";

grant references on table "public"."support_assistants" to "authenticated";

grant select on table "public"."support_assistants" to "authenticated";

grant trigger on table "public"."support_assistants" to "authenticated";

grant truncate on table "public"."support_assistants" to "authenticated";

grant update on table "public"."support_assistants" to "authenticated";

grant delete on table "public"."support_assistants" to "service_role";

grant insert on table "public"."support_assistants" to "service_role";

grant references on table "public"."support_assistants" to "service_role";

grant select on table "public"."support_assistants" to "service_role";

grant trigger on table "public"."support_assistants" to "service_role";

grant truncate on table "public"."support_assistants" to "service_role";

grant update on table "public"."support_assistants" to "service_role";


