CREATE TYPE "public"."contract_type" AS ENUM('contract', 'waiver');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'paid', 'unpaid', 'uncollectible', 'void');--> statement-breakpoint
CREATE TYPE "public"."location_status" AS ENUM('incomplete', 'active', 'past_due', 'canceled', 'paused', 'trialing', 'unpaid', 'incomplete_expired');--> statement-breakpoint
CREATE TYPE "public"."relationship" AS ENUM('parent', 'spouse', 'child', 'sibling', 'other');--> statement-breakpoint
CREATE TYPE "public"."package_status" AS ENUM('active', 'incomplete', 'expired', 'completed');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('card', 'cash', 'check', 'zelle', 'venmo', 'paypal', 'apple', 'google');--> statement-breakpoint
CREATE TYPE "public"."plan_interval" AS ENUM('day', 'week', 'month', 'year');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('recurring', 'one-time');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('active', 'expired', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."role_color" AS ENUM('red', 'green', 'blue', 'pink', 'cyan', 'lime', 'orange', 'fuchsia', 'sky', 'lemon', 'purple', 'yellow');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('paid', 'failed', 'incomplete');--> statement-breakpoint
CREATE TABLE "account" (
	"user_id" integer,
	"vendor_id" integer,
	"type" text,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" text,
	"token_type" text,
	"id_token" text,
	"scope" text,
	"session_state" text,
	CONSTRAINT "account_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer,
	"title" varchar(255) NOT NULL,
	"badge" varchar(255) NOT NULL,
	"location_id" integer NOT NULL,
	"points" integer NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"description" varchar,
	"icon" varchar
);
--> statement-breakpoint
CREATE TABLE "achievement_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"achievement_id" integer NOT NULL,
	"action_id" integer NOT NULL,
	"count" integer NOT NULL,
	"metadata" varchar(255),
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"reservation_id" integer NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"check_in_time" timestamp with time zone DEFAULT now() NOT NULL,
	"check_out_time" timestamp with time zone,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	"ip_address" text,
	"mac_address" text,
	"lat" integer,
	"lng" integer
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"location_id" integer,
	"content" text,
	"title" varchar(255),
	"description" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	"is_draft" boolean DEFAULT false NOT NULL,
	"editable" boolean DEFAULT true NOT NULL,
	"require_signature" boolean DEFAULT true NOT NULL,
	"type" text DEFAULT 'contract'
);
--> statement-breakpoint
CREATE TABLE "import_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(255),
	"last_renewal_day" date NOT NULL,
	"status" varchar(255) DEFAULT 'Active' NOT NULL,
	"terms" varchar(255) DEFAULT 'months' NOT NULL,
	"term_count" integer NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"program_id" integer,
	"plan_id" integer,
	"processed" boolean DEFAULT false NOT NULL,
	"location_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password" text,
	"remember_token" text,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "location_state" (
	"location_id" integer PRIMARY KEY NOT NULL,
	"plan_id" integer,
	"pkg_id" integer,
	"payment_plan_id" integer,
	"waiver_id" integer,
	"agree_to_terms" boolean DEFAULT false NOT NULL,
	"last_renewal_date" timestamp with time zone DEFAULT now(),
	"start_date" timestamp with time zone,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"usage_percent" integer DEFAULT 0 NOT NULL,
	"status" "location_status" DEFAULT 'incomplete' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"email" varchar(255),
	"industry" varchar(255),
	"address" text,
	"city" varchar(255),
	"state" varchar(255),
	"postal_code" varchar(255),
	"website" text,
	"country" varchar(255),
	"phone" varchar(255),
	"timezone" varchar(255),
	"logo_url" varchar(255),
	"meta_data" jsonb,
	"vendor_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "locations_name_unique" UNIQUE("name"),
	CONSTRAINT "locations_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "member_locations" (
	"member_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"stripe_customer_id" text,
	"status" "location_status" DEFAULT 'incomplete' NOT NULL,
	"incomplete_plan" jsonb,
	"invite_date" timestamp with time zone,
	"invite_accepted_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"waiver_id" integer,
	CONSTRAINT "member_locations_member_id_location_id_pk" PRIMARY KEY("member_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "program_levels" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"capacity" double precision NOT NULL,
	"min_age" integer NOT NULL,
	"max_age" integer NOT NULL,
	"program_id" integer NOT NULL,
	"parent_id" integer,
	"instructor_id" integer,
	"interval" text DEFAULT 'week',
	"interval_threshold" smallint DEFAULT 1,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "member_programs" (
	"program_id" integer,
	"member_id" integer,
	CONSTRAINT "member_programs_member_id_program_id_pk" PRIMARY KEY("member_id","program_id")
);
--> statement-breakpoint
CREATE TABLE "program_sessions" (
	"id" integer PRIMARY KEY NOT NULL,
	"program_level_id" integer,
	"time" time NOT NULL,
	"duration" smallint DEFAULT 0 NOT NULL,
	"day" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(255),
	"location_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer,
	"related_member_id" integer,
	"relationship" "relationship" DEFAULT 'other' NOT NULL,
	"is_payer" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "member_achievements" (
	"member_id" integer,
	"achievement_id" integer,
	"note" text,
	"status" text,
	"progress" integer DEFAULT 0,
	"date_achieved" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_achievements_member_id_achievement_id_pk" PRIMARY KEY("member_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "member_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer,
	"contract_id" integer,
	"location_id" integer,
	"member_plan_id" integer,
	"signature" text,
	"variables" jsonb DEFAULT '{}'::jsonb,
	"signed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "member_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"currency" text,
	"member_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"member_package_id" uuid,
	"member_subscription_id" integer,
	"description" text,
	"items" jsonb[] DEFAULT '{}'::jsonb[],
	"paid" boolean DEFAULT false NOT NULL,
	"tax" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"for_period_start" timestamp with time zone,
	"for_period_end" timestamp with time zone,
	"due_date" timestamp with time zone DEFAULT now() NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"invoice_pdf" text,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "member_rewards" (
	"member_id" integer,
	"location_id" integer,
	"reward_id" integer,
	"previous_points" integer,
	"status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_rewards_member_id_location_id_reward_id_pk" PRIMARY KEY("member_id","location_id","reward_id")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"first_name" text NOT NULL,
	"last_name" text,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"referral_code" text NOT NULL,
	"current_points" integer DEFAULT 0 NOT NULL,
	"gender" text,
	"dob" timestamp,
	"avatar" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"service" text NOT NULL,
	"api_key" varchar(255),
	"secret_key" varchar(255),
	"access_token" varchar(255),
	"refresh_token" varchar(255),
	"integration_id" varchar(255) NOT NULL,
	"additional_settings" json,
	"created_at" timestamp,
	"updated_at" timestamp,
	"location_id" integer,
	CONSTRAINT "integrations_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "member_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_plan_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"payer_id" integer,
	"beneficiary_id" integer NOT NULL,
	"program_level_id" integer NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"expire_date" timestamp with time zone,
	"status" "package_status" NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"total_class_attended" integer DEFAULT 0 NOT NULL,
	"total_class_limit" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"family" boolean DEFAULT false NOT NULL,
	"family_member_limit" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"program_id" integer NOT NULL,
	"contract_id" integer,
	"interval" "plan_interval" DEFAULT 'month',
	"interval_threshold" integer DEFAULT 1,
	"type" "plan_type" DEFAULT 'recurring' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"stripe_price_id" text,
	"total_class_limit" integer,
	"class_limit_interval" "plan_interval",
	"class_limit_threshold" integer,
	"expire_interval" "plan_interval",
	"expire_threshold" integer,
	"billing_anchor_config" jsonb DEFAULT '{}'::jsonb,
	"allow_proration" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "member_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"payer_id" integer,
	"beneficiary_id" integer NOT NULL,
	"member_plan_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"program_level_id" integer NOT NULL,
	"stripe_subscription_id" text,
	"status" "location_status" DEFAULT 'incomplete' NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"trial_end" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"payment_method" "payment_method" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"location_id" integer NOT NULL,
	"icon" varchar(255),
	"required_points" integer NOT NULL,
	"limit_per_member" integer NOT NULL,
	"limit_total" varchar(255) DEFAULT 'unlimited' NOT NULL,
	"images" text[] NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" integer PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"member_id" integer,
	"member_subscription_id" integer,
	"member_package_id" integer,
	"location_id" integer,
	"status" "reservation_status" DEFAULT 'active' NOT NULL,
	"expired_on" timestamp with time zone,
	"canceled_on" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "model_has_roles" (
	"role_id" integer,
	"model_id" integer,
	"model_type" varchar(255) NOT NULL,
	CONSTRAINT "model_has_roles_role_id_model_id_model_type_pk" PRIMARY KEY("role_id","model_id","model_type"),
	CONSTRAINT "model_has_roles_model_id_model_type_unique" UNIQUE("model_id","model_type")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"guard_name" varchar(255) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "permissions_name_guard_name_unique" UNIQUE("name","guard_name")
);
--> statement-breakpoint
CREATE TABLE "role_has_permissions" (
	"role_id" integer,
	"permission_id" integer,
	CONSTRAINT "role_has_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"guard_name" varchar(255) NOT NULL,
	"location_id" integer,
	"color" "role_color",
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "roles_name_guard_name_unique" UNIQUE("name","guard_name")
);
--> statement-breakpoint
CREATE TABLE "staffs" (
	"id" integer PRIMARY KEY NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(255) NOT NULL,
	"avatar" varchar(255),
	"user_id" integer NOT NULL,
	"role_id" integer,
	"location_id" integer,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" integer PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"stripe_customer_id" text,
	"phone_number" text,
	"company_name" text,
	"company_email" text NOT NULL,
	"company_website" text,
	"company_address" text,
	"icon" text,
	"credits" double precision DEFAULT 0 NOT NULL,
	"spended_credits" double precision DEFAULT 0 NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "vendors_company_email_unique" UNIQUE("company_email")
);
--> statement-breakpoint
CREATE TABLE "wallet" (
	"id" integer PRIMARY KEY NOT NULL,
	"location_id" integer NOT NULL,
	"balance" double precision DEFAULT 0 NOT NULL,
	"credit" double precision DEFAULT 0 NOT NULL,
	"recharge_amount" double precision DEFAULT 20 NOT NULL,
	"recharge_threshold" double precision DEFAULT 10 NOT NULL,
	"last_charged" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vendor_badges" (
	"id" integer PRIMARY KEY NOT NULL,
	"vendor_progress_id" integer NOT NULL,
	"badge_id" integer NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vendor_claimed_rewards" (
	"id" integer PRIMARY KEY NOT NULL,
	"vendor_progress_id" integer NOT NULL,
	"reward_id" integer NOT NULL,
	"claimed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_progress" (
	"id" integer PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"points" double precision DEFAULT 0 NOT NULL,
	"total_points" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vendor_rewards" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"images" text NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"required_points" integer NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vendor_referrals" (
	"id" integer PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"referral_id" integer NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" integer PRIMARY KEY NOT NULL,
	"description" text,
	"item" text,
	"transaction_type" text NOT NULL,
	"payment_type" text NOT NULL,
	"payment_method" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "transaction_status" DEFAULT 'incomplete' NOT NULL,
	"member_id" integer,
	"location_id" integer NOT NULL,
	"invoice_id" uuid,
	"subscription_id" integer,
	"package_id" uuid,
	"charge_date" timestamp with time zone DEFAULT now() NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"refunded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "transactions_invoice_id_unique" UNIQUE("invoice_id")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_actions" ADD CONSTRAINT "achievement_actions_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_actions" ADD CONSTRAINT "achievement_actions_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "import_members" ADD CONSTRAINT "import_members_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_state" ADD CONSTRAINT "location_state_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_state" ADD CONSTRAINT "location_state_waiver_id_locations_id_fk" FOREIGN KEY ("waiver_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_locations" ADD CONSTRAINT "member_locations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_locations" ADD CONSTRAINT "member_locations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_locations" ADD CONSTRAINT "member_locations_waiver_id_locations_id_fk" FOREIGN KEY ("waiver_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_levels" ADD CONSTRAINT "program_levels_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_levels" ADD CONSTRAINT "program_levels_instructor_id_staffs_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."staffs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_programs" ADD CONSTRAINT "member_programs_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_programs" ADD CONSTRAINT "member_programs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_program_level_id_program_levels_id_fk" FOREIGN KEY ("program_level_id") REFERENCES "public"."program_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_related_member_id_members_id_fk" FOREIGN KEY ("related_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_achievements" ADD CONSTRAINT "member_achievements_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_achievements" ADD CONSTRAINT "member_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_contracts" ADD CONSTRAINT "member_contracts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_contracts" ADD CONSTRAINT "member_contracts_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_contracts" ADD CONSTRAINT "member_contracts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_contracts" ADD CONSTRAINT "member_contracts_member_plan_id_member_plans_id_fk" FOREIGN KEY ("member_plan_id") REFERENCES "public"."member_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_invoices" ADD CONSTRAINT "member_invoices_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_invoices" ADD CONSTRAINT "member_invoices_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_invoices" ADD CONSTRAINT "member_invoices_member_package_id_member_packages_id_fk" FOREIGN KEY ("member_package_id") REFERENCES "public"."member_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_invoices" ADD CONSTRAINT "member_invoices_member_subscription_id_member_subscriptions_id_fk" FOREIGN KEY ("member_subscription_id") REFERENCES "public"."member_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_rewards" ADD CONSTRAINT "member_rewards_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_rewards" ADD CONSTRAINT "member_rewards_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_rewards" ADD CONSTRAINT "member_rewards_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_member_plan_id_member_plans_id_fk" FOREIGN KEY ("member_plan_id") REFERENCES "public"."member_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_payer_id_members_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_beneficiary_id_members_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_program_level_id_program_levels_id_fk" FOREIGN KEY ("program_level_id") REFERENCES "public"."program_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_plans" ADD CONSTRAINT "member_plans_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_plans" ADD CONSTRAINT "member_plans_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_payer_id_members_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_beneficiary_id_members_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_member_plan_id_member_plans_id_fk" FOREIGN KEY ("member_plan_id") REFERENCES "public"."member_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_program_level_id_program_levels_id_fk" FOREIGN KEY ("program_level_id") REFERENCES "public"."program_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_session_id_program_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."program_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_member_subscription_id_member_subscriptions_id_fk" FOREIGN KEY ("member_subscription_id") REFERENCES "public"."member_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_member_package_id_member_packages_id_fk" FOREIGN KEY ("member_package_id") REFERENCES "public"."member_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_has_roles" ADD CONSTRAINT "model_has_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_has_roles" ADD CONSTRAINT "model_has_roles_model_id_users_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_has_permissions" ADD CONSTRAINT "role_has_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_has_permissions" ADD CONSTRAINT "role_has_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staffs" ADD CONSTRAINT "staffs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staffs" ADD CONSTRAINT "staffs_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staffs" ADD CONSTRAINT "staffs_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_badges" ADD CONSTRAINT "vendor_badges_vendor_progress_id_vendor_progress_id_fk" FOREIGN KEY ("vendor_progress_id") REFERENCES "public"."vendor_progress"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_claimed_rewards" ADD CONSTRAINT "vendor_claimed_rewards_vendor_progress_id_vendor_progress_id_fk" FOREIGN KEY ("vendor_progress_id") REFERENCES "public"."vendor_progress"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_claimed_rewards" ADD CONSTRAINT "vendor_claimed_rewards_reward_id_vendor_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."vendor_rewards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_progress" ADD CONSTRAINT "vendor_progress_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_progress" ADD CONSTRAINT "vendor_progress_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_referrals" ADD CONSTRAINT "vendor_referrals_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_referrals" ADD CONSTRAINT "vendor_referrals_referral_id_vendors_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_id_member_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."member_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subscription_id_member_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."member_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_package_id_member_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."member_packages"("id") ON DELETE cascade ON UPDATE no action;