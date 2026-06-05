import { sql } from "drizzle-orm";
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import type { GMBLocation, LocationSettings } from "../types";
import type { Currency } from "../types/currency";
import { LocationStatusEnum } from "./DatabaseEnums";
import { integrations } from "./integrations";
import { locations } from "./locations";

export const locationState = pgTable("location_state", {
	locationId: text("location_id").primaryKey().references(() => locations.id, { onDelete: "cascade" }),
	paymentGatewayId: text("payment_gateway_id").references(() => integrations.id, { onDelete: "cascade" }),
	planId: integer("plan_id").notNull().default(1),
	waiverId: text("waiver_id"),
	currency: text("currency").$type<Currency>().notNull().default("UNKNOWN_CURRENCY"),
	agreeToTerms: boolean("agree_to_terms").notNull().default(false),
	allowAppCheckIns: boolean("allow_app_check_ins").notNull().default(true),
	lastRenewalDate: timestamp("last_renewal_date", { withTimezone: true, }).defaultNow(),
	startDate: timestamp("start_date", { withTimezone: true }),
	settings: jsonb("settings").$type<LocationSettings>().notNull().default(sql`'{}'::jsonb`),
	usagePercent: integer("usage_percent").notNull().default(0),
	gmb: jsonb("gmb").$type<GMBLocation>(),
	premiumSupport: boolean("premium_support").notNull().default(false),
	status: LocationStatusEnum("status").notNull().default("incomplete"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});
