import { sql } from "drizzle-orm";
import {
	boolean,
	text,
	timestamp,
	pgTable,
	jsonb,
	integer,
	uuid,
} from "drizzle-orm/pg-core";
import { vendors } from "./vendors";
import { LocationStatusEnum } from "./DatabaseEnums";
import type { LocationSettings } from "../types";
import { contractTemplates } from "./contracts";

export const locations = pgTable("locations", {
	id: uuid("id")
		.primaryKey()
		.notNull()
		.default(sql`uuid_base62()`),
	name: text("name").notNull().unique(),
	legalName: text("legal_name"),
	email: text("email"),
	industry: text("industry"),
	address: text("address").unique(),
	city: text("city"),
	state: LocationStatusEnum("state"),
	postalCode: text("postal_code"),
	website: text("website"),
	country: text("country"),
	phone: text("phone"),
	timezone: text("timezone").notNull().default("America/New_York"),
	logoUrl: text("logo_url"),
	slug: text("slug").unique().notNull(),
	metadata: jsonb("metadata"),
	about: text("about"),
	vendorId: text("vendor_id")
		.notNull()
		.references(() => vendors.id, { onDelete: "cascade" }),
	created: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const locationState = pgTable("location_state", {
	locationId: text("location_id")
		.primaryKey()
		.references(() => locations.id, { onDelete: "cascade" }),
	planId: integer("plan_id").notNull().default(1),
	waiverId: text("waiver_id").references(() => contractTemplates.id, {
		onDelete: "set null",
	}),
	agreeToTerms: boolean("agree_to_terms").notNull().default(false),
	lastRenewalDate: timestamp("last_renewal_date", {
		withTimezone: true,
	}).defaultNow(),
	startDate: timestamp("start_date", { withTimezone: true }),
	settings: jsonb("settings").$type<LocationSettings>().notNull().default(sql`'{}'::jsonb`),
	usagePercent: integer("usage_percent").notNull().default(0),
	premiumSupport: boolean("premium_support").notNull().default(false),
	status: LocationStatusEnum("status").notNull().default("incomplete"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});




