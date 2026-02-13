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
	waiverId: text("waiver_id").references(() => locations.id, {
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

export const wallets = pgTable("wallets", {
	id: uuid("id")
		.primaryKey()
		.notNull()
		.default(sql`uuid_base62()`),
	locationId: text("location_id")
		.notNull()
		.references(() => locations.id, { onDelete: "cascade" }),
	balance: integer("balance").notNull().default(0),
	credits: integer("credits").notNull().default(0),
	rechargeAmount: integer("recharge_amount").notNull().default(2500),
	rechargeThreshold: integer("recharge_threshold").notNull().default(1000),
	lastCharged: timestamp("last_charged", { withTimezone: true }),
	created: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const walletUsages = pgTable("wallet_usages", {
	id: uuid("id")
		.primaryKey()
		.notNull()
		.default(sql`uuid_base62()`),
	walletId: text("wallet_id")
		.notNull()
		.references(() => wallets.id, { onDelete: "cascade" }),
	description: text("description").notNull(),
	amount: integer("amount").notNull().default(0),
	balance: integer("balance").notNull().default(0),
	isCredit: boolean("is_credit").notNull().default(false),
	activityDate: timestamp("activity_date").notNull(),
	created: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});





