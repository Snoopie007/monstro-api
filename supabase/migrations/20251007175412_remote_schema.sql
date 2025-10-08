alter table "public"."location_state" alter column "status" drop default;

alter table "public"."member_locations" alter column "status" drop default;

alter table "public"."support_messages" alter column "role" drop default;

alter type "public"."location_status" rename to "location_status__old_version_to_be_dropped";

create type "public"."location_status" as enum ('incomplete', 'active', 'past_due', 'canceled', 'paused', 'trialing', 'unpaid', 'incomplete_expired', 'archived');

alter type "public"."message_role" rename to "message_role__old_version_to_be_dropped";

create type "public"."message_role" as enum ('human', 'ai', 'staff', 'system', 'tool', 'tool_message', 'tool_call');

alter table "public"."location_state" alter column status type "public"."location_status" using status::text::"public"."location_status";

alter table "public"."member_locations" alter column status type "public"."location_status" using status::text::"public"."location_status";

alter table "public"."support_messages" alter column role type "public"."message_role" using role::text::"public"."message_role";

alter table "public"."location_state" alter column "status" set default 'incomplete'::location_status;

alter table "public"."member_locations" alter column "status" set default 'incomplete'::location_status;

alter table "public"."support_messages" alter column "role" set default 'system'::message_role;

drop type "public"."location_status__old_version_to_be_dropped";

drop type "public"."message_role__old_version_to_be_dropped";

alter table "public"."support_assistants" drop column "name";

alter table "public"."support_assistants" alter column "temperature" drop default;

alter table "public"."support_assistants" alter column "temperature" set data type numeric using "temperature"::numeric;

alter table "public"."support_conversations" alter column "is_vendor_active" set not null;


