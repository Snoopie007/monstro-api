alter table "public"."support_triggers" drop constraint "support_triggers_support_bot_id_fkey";

drop index if exists "public"."idx_support_triggers_bot_id";

alter table "public"."support_messages" alter column "role" drop default;

alter type "public"."message_role" rename to "message_role__old_version_to_be_dropped";

create type "public"."message_role" as enum ('user', 'assistant', 'staff', 'system', 'tool', 'developer', 'tool_result', 'tool_response', 'tool_message', 'agent');

alter table "public"."support_messages" alter column role type "public"."message_role" using role::text::"public"."message_role";

drop type "public"."message_role__old_version_to_be_dropped";

alter table "public"."support_assistants" add column "knowledge_base" jsonb not null default '{"document": null, "qa_entries": []}'::jsonb;

alter table "public"."support_assistants" add column "model_id" text;

alter table "public"."support_conversations" alter column "category" set default ''::text;

alter table "public"."support_conversations" alter column "category" drop not null;

alter table "public"."support_messages" alter column "role" set default 'system'::message_role;

alter table "public"."support_triggers" drop column "support_bot_id";

alter table "public"."support_triggers" add column "support_assistant_id" text not null;

CREATE INDEX idx_support_assistants_knowledge_base ON public.support_assistants USING gin (knowledge_base);

CREATE INDEX idx_support_triggers_bot_id ON public.support_triggers USING btree (support_assistant_id);

alter table "public"."support_assistants" add constraint "knowledge_base_structure_check" CHECK (((knowledge_base ? 'qa_entries'::text) AND (knowledge_base ? 'document'::text) AND (jsonb_typeof((knowledge_base -> 'qa_entries'::text)) = 'array'::text))) not valid;

alter table "public"."support_assistants" validate constraint "knowledge_base_structure_check";

alter table "public"."support_triggers" add constraint "support_triggers_support_assistant_id_fkey" FOREIGN KEY (support_assistant_id) REFERENCES support_assistants(id) ON DELETE CASCADE not valid;

alter table "public"."support_triggers" validate constraint "support_triggers_support_assistant_id_fkey";


