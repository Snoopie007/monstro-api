drop extension if exists "pg_net";

revoke delete on table "public"."support_tickets" from "anon";

revoke insert on table "public"."support_tickets" from "anon";

revoke references on table "public"."support_tickets" from "anon";

revoke select on table "public"."support_tickets" from "anon";

revoke trigger on table "public"."support_tickets" from "anon";

revoke truncate on table "public"."support_tickets" from "anon";

revoke update on table "public"."support_tickets" from "anon";

revoke delete on table "public"."support_tickets" from "authenticated";

revoke insert on table "public"."support_tickets" from "authenticated";

revoke references on table "public"."support_tickets" from "authenticated";

revoke select on table "public"."support_tickets" from "authenticated";

revoke trigger on table "public"."support_tickets" from "authenticated";

revoke truncate on table "public"."support_tickets" from "authenticated";

revoke update on table "public"."support_tickets" from "authenticated";

revoke delete on table "public"."support_tickets" from "service_role";

revoke insert on table "public"."support_tickets" from "service_role";

revoke references on table "public"."support_tickets" from "service_role";

revoke select on table "public"."support_tickets" from "service_role";

revoke trigger on table "public"."support_tickets" from "service_role";

revoke truncate on table "public"."support_tickets" from "service_role";

revoke update on table "public"."support_tickets" from "service_role";

revoke delete on table "public"."tickets" from "anon";

revoke insert on table "public"."tickets" from "anon";

revoke references on table "public"."tickets" from "anon";

revoke select on table "public"."tickets" from "anon";

revoke trigger on table "public"."tickets" from "anon";

revoke truncate on table "public"."tickets" from "anon";

revoke update on table "public"."tickets" from "anon";

revoke delete on table "public"."tickets" from "authenticated";

revoke insert on table "public"."tickets" from "authenticated";

revoke references on table "public"."tickets" from "authenticated";

revoke select on table "public"."tickets" from "authenticated";

revoke trigger on table "public"."tickets" from "authenticated";

revoke truncate on table "public"."tickets" from "authenticated";

revoke update on table "public"."tickets" from "authenticated";

revoke delete on table "public"."tickets" from "service_role";

revoke insert on table "public"."tickets" from "service_role";

revoke references on table "public"."tickets" from "service_role";

revoke select on table "public"."tickets" from "service_role";

revoke trigger on table "public"."tickets" from "service_role";

revoke truncate on table "public"."tickets" from "service_role";

revoke update on table "public"."tickets" from "service_role";

alter table "public"."reward_claims" drop constraint "reward_claims_member_id_fkey";

alter table "public"."reward_claims" drop constraint "reward_claims_reward_id_fkey";

alter table "public"."support_tickets" drop constraint "support_tickets_assigned_to_fkey";

alter table "public"."support_tickets" drop constraint "support_tickets_conversation_id_fkey";

alter table "public"."support_tickets" drop constraint "support_tickets_pkey";

alter table "public"."tickets" drop constraint "tickets_pkey";

drop index if exists "public"."idx_support_tickets_conversation_id";

drop index if exists "public"."idx_support_tickets_status";

drop index if exists "public"."idx_tickets_conversation_id";

drop index if exists "public"."idx_tickets_created_at";

drop index if exists "public"."support_tickets_pkey";

drop index if exists "public"."tickets_pkey";

drop table "public"."support_tickets";

drop table "public"."tickets";

alter table "public"."account" enable row level security;

alter table "public"."achievement_triggers" enable row level security;

alter table "public"."achievements" enable row level security;

alter table "public"."check_ins" enable row level security;

alter table "public"."contracts" enable row level security;

alter table "public"."family_members" enable row level security;

alter table "public"."import_members" enable row level security;

alter table "public"."integrations" enable row level security;

alter table "public"."locations" enable row level security;

alter table "public"."member_achievements" enable row level security;

alter table "public"."member_contracts" drop column "signed";

alter table "public"."member_contracts" drop column "variables";

alter table "public"."member_contracts" add column "pdf_filename" text;

alter table "public"."member_contracts" enable row level security;

alter table "public"."member_custom_fields" enable row level security;

alter table "public"."member_fields" enable row level security;

alter table "public"."member_has_tags" enable row level security;

alter table "public"."member_invoices" enable row level security;

alter table "public"."member_locations" add column "onboarded" boolean not null default false;

alter table "public"."member_locations" add column "profile" jsonb;

alter table "public"."member_locations" alter column "points" set default '0'::bigint;

alter table "public"."member_locations" alter column "points" set data type bigint using "points"::bigint;

alter table "public"."member_locations" enable row level security;

alter table "public"."member_packages" enable row level security;

alter table "public"."member_plans" enable row level security;

alter table "public"."member_points_history" enable row level security;

alter table "public"."member_referrals" enable row level security;

alter table "public"."member_subscriptions" enable row level security;

alter table "public"."member_tags" alter column "location_id" drop not null;

alter table "public"."member_tags" enable row level security;

alter table "public"."members" add column "first_time" boolean not null default true;

alter table "public"."members" enable row level security;

alter table "public"."permissions" enable row level security;

alter table "public"."plan_programs" enable row level security;

alter table "public"."program_has_tags" enable row level security;

alter table "public"."program_sessions" enable row level security;

alter table "public"."program_tags" enable row level security;

alter table "public"."programs" enable row level security;

alter table "public"."recurring_reservations" enable row level security;

alter table "public"."recurring_reservations_exceptions" enable row level security;

alter table "public"."reservations" enable row level security;

alter table "public"."reward_claims" enable row level security;

alter table "public"."rewards" enable row level security;

alter table "public"."role_has_permissions" enable row level security;

alter table "public"."roles" enable row level security;

alter table "public"."session_waitlist" enable row level security;

alter table "public"."sessions" enable row level security;

alter table "public"."staff_location_roles" enable row level security;

alter table "public"."staff_locations" enable row level security;

alter table "public"."staffs" enable row level security;

alter table "public"."support_conversations" add column "description" text;

alter table "public"."support_conversations" add column "priority" integer not null default 3;

alter table "public"."support_conversations" add column "status" ticket_status not null default 'open'::ticket_status;

alter table "public"."support_conversations" add column "title" text not null default 'Support Request'::text;

alter table "public"."support_plans" enable row level security;

alter table "public"."transactions" enable row level security;

alter table "public"."triggered_achievements" enable row level security;

alter table "public"."user_roles" enable row level security;

alter table "public"."users" enable row level security;

alter table "public"."vendor_badges" enable row level security;

alter table "public"."vendor_claimed_rewards" enable row level security;

alter table "public"."vendor_levels" enable row level security;

alter table "public"."vendor_referrals" enable row level security;

alter table "public"."vendor_rewards" enable row level security;

alter table "public"."vendors" enable row level security;

alter table "public"."wallet_usages" enable row level security;

alter table "public"."wallets" enable row level security;

CREATE INDEX idx_member_custom_fields_field_id ON public.member_custom_fields USING btree (custom_field_id);

CREATE INDEX idx_member_custom_fields_member_id ON public.member_custom_fields USING btree (member_id);

CREATE INDEX idx_member_fields_location_id ON public.member_fields USING btree (location_id);

CREATE INDEX idx_member_fields_type ON public.member_fields USING btree (type);

CREATE INDEX idx_member_has_tags_composite ON public.member_has_tags USING btree (member_id, tag_id);

CREATE INDEX idx_member_has_tags_member_id ON public.member_has_tags USING btree (member_id);

CREATE INDEX idx_member_has_tags_tag_id ON public.member_has_tags USING btree (tag_id);

CREATE INDEX idx_member_tags_location_id ON public.member_tags USING btree (location_id);

CREATE INDEX idx_member_tags_name_location ON public.member_tags USING btree (name, location_id);

CREATE INDEX idx_support_conversations_priority ON public.support_conversations USING btree (priority);

CREATE INDEX idx_support_conversations_status ON public.support_conversations USING btree (status);

CREATE UNIQUE INDEX recurring_reservations_exceptions_pkey ON public.recurring_reservations_exceptions USING btree (recurring_reservation_id, occurrence_date);

CREATE UNIQUE INDEX unique_family_relation ON public.family_members USING btree (member_id, related_member_id);

CREATE UNIQUE INDEX unique_tag_name_per_location ON public.member_tags USING btree (name, location_id);

alter table "public"."recurring_reservations_exceptions" add constraint "recurring_reservations_exceptions_pkey" PRIMARY KEY using index "recurring_reservations_exceptions_pkey";

alter table "public"."family_members" add constraint "unique_family_relation" UNIQUE using index "unique_family_relation";

alter table "public"."member_tags" add constraint "unique_tag_name_per_location" UNIQUE using index "unique_tag_name_per_location";

alter table "public"."reward_claims" add constraint "reward_claims_member_id_foreign" FOREIGN KEY (member_id) REFERENCES members(id) not valid;

alter table "public"."reward_claims" validate constraint "reward_claims_member_id_foreign";

alter table "public"."reward_claims" add constraint "reward_claims_reward_id_foreign" FOREIGN KEY (reward_id) REFERENCES rewards(id) not valid;

alter table "public"."reward_claims" validate constraint "reward_claims_reward_id_foreign";

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


  create policy "Member check-in access"
  on "public"."check_ins"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM (reservations r
     JOIN members m ON ((r.member_id = m.id)))
  WHERE ((r.id = check_ins.reservation_id) AND ((m.id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (m.user_id = (auth.uid())::text))))) OR (EXISTS ( SELECT 1
   FROM (recurring_reservations rr
     JOIN members m ON ((rr.member_id = m.id)))
  WHERE ((rr.id = check_ins.recurring_id) AND ((m.id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (m.user_id = (auth.uid())::text)))))));



  create policy "Member check-in insert"
  on "public"."check_ins"
  as permissive
  for insert
  to public
with check (((EXISTS ( SELECT 1
   FROM (reservations r
     JOIN members m ON ((r.member_id = m.id)))
  WHERE ((r.id = check_ins.reservation_id) AND ((m.id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (m.user_id = (auth.uid())::text))))) OR (EXISTS ( SELECT 1
   FROM (recurring_reservations rr
     JOIN members m ON ((rr.member_id = m.id)))
  WHERE ((rr.id = check_ins.recurring_id) AND ((m.id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (m.user_id = (auth.uid())::text)))))));



  create policy "allow anon update"
  on "public"."location_state"
  as permissive
  for update
  to anon
using (true);



  create policy "Member contract access"
  on "public"."member_contracts"
  as permissive
  for select
  to public
using (((member_id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = member_contracts.member_id) AND (m.user_id = (auth.uid())::text))))));



  create policy "Member contract update"
  on "public"."member_contracts"
  as permissive
  for update
  to public
using (((member_id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = member_contracts.member_id) AND (m.user_id = (auth.uid())::text))))));



  create policy "Member invoice access"
  on "public"."member_invoices"
  as permissive
  for select
  to public
using (((member_id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = member_invoices.member_id) AND (m.user_id = (auth.uid())::text))))));



  create policy "Member location access"
  on "public"."member_locations"
  as permissive
  for select
  to public
using (((member_id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = member_locations.member_id) AND (m.user_id = (auth.uid())::text))))));



  create policy "Member package access"
  on "public"."member_packages"
  as permissive
  for select
  to public
using (((member_id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = member_packages.member_id) AND (m.user_id = (auth.uid())::text))))));



  create policy "Member package update"
  on "public"."member_packages"
  as permissive
  for update
  to public
using (((member_id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = member_packages.member_id) AND (m.user_id = (auth.uid())::text))))));



  create policy "Member subscription access"
  on "public"."member_subscriptions"
  as permissive
  for select
  to public
using ((member_id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)));



  create policy "Member subscription update"
  on "public"."member_subscriptions"
  as permissive
  for update
  to public
using (((member_id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = member_subscriptions.member_id) AND (m.user_id = (auth.uid())::text))))));



  create policy "Members can update own data"
  on "public"."members"
  as permissive
  for update
  to public
using (((user_id = (auth.uid())::text) OR (id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text))));



  create policy "Members can view own data"
  on "public"."members"
  as permissive
  for select
  to public
using (((user_id = (auth.uid())::text) OR (id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text))));



  create policy "Member reservation access"
  on "public"."reservations"
  as permissive
  for select
  to public
using (((member_id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = reservations.member_id) AND (m.user_id = (auth.uid())::text))))));



  create policy "Member reservation insert"
  on "public"."reservations"
  as permissive
  for insert
  to public
with check (((member_id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = reservations.member_id) AND (m.user_id = (auth.uid())::text))))));



  create policy "Member reservation update"
  on "public"."reservations"
  as permissive
  for update
  to public
using (((member_id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = reservations.member_id) AND (m.user_id = (auth.uid())::text))))));



  create policy "Member reward claims access"
  on "public"."reward_claims"
  as permissive
  for select
  to public
using (((member_id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = reward_claims.member_id) AND (m.user_id = (auth.uid())::text))))));



  create policy "Member reward claims insert"
  on "public"."reward_claims"
  as permissive
  for insert
  to public
with check (((member_id = (((auth.jwt() ->> 'user_metadata'::text))::json ->> 'member_id'::text)) OR (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.id = reward_claims.member_id) AND (m.user_id = (auth.uid())::text))))));



  create policy "Users can update own data"
  on "public"."users"
  as permissive
  for update
  to public
using ((id = (auth.uid())::text));



  create policy "Users can view own data"
  on "public"."users"
  as permissive
  for select
  to public
using ((id = (auth.uid())::text));



