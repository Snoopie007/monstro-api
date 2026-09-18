import { sql } from "drizzle-orm";
import { bigint, boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import type { AdsSetupProgress } from "../../types/ads";
import { integrations } from "../integrations";

export const AdsModeEnum = pgEnum("ads_mode", ["simple", "advance"]);

export const adsSettings = pgTable("ads_settings", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
	integrationId: text("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
	conversionActions: jsonb("conversion_actions").$type<{ id: string; name: string }[]>().notNull().default(sql`'[]'::jsonb`),
	runningCampaigns: text("running_campaigns").array().notNull().default(sql`'{}'::text[]`),
	isSetup: boolean("is_setup").notNull().default(false),
	mode: AdsModeEnum("mode"),
	setup: jsonb("setup").$type<AdsSetupProgress>().notNull().default(sql`'{}'::jsonb`),
	maxSpendMicros: bigint("max_spend_micros", { mode: "number" }),
	checkIntervalMinutes: integer("check_interval_minutes").notNull().default(60),
	lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
	instructions: text("instructions"),
	rules: jsonb("rules").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	unique("ads_settings_integration_unique").on(t.integrationId),
]);
