import { relations, sql } from "drizzle-orm";
import {
	boolean,
	primaryKey,
	text,
	timestamp,
	pgTable,
	jsonb,
	integer,
	uuid,
} from "drizzle-orm/pg-core";
import {
	memberInvoices,
	memberPointsHistory,
	memberReferrals,
	members,
} from "./members";
import { integrations } from "./integrations";
import { programs } from "./programs";
import { transactions } from "./transactions";
import { vendors } from "./vendors";
import { memberPlans, memberSubscriptions } from "./MemberPlans";
import { LocationStatusEnum } from "./DatabaseEnums";
import type { MemberLocationProfile } from "../types/member";
import { attendances } from "./attendances";
import type { LocationSettings } from "../types";
import { taxRates } from "./tax";
import { memberPaymentMethods } from "./PaymentMethods";

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

export const memberLocations = pgTable("member_locations", {
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	status: LocationStatusEnum("status").notNull().default("incomplete"),
	points: integer("points").notNull().default(0),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: false }),
	waiverId: text("waiver_id").references(() => locations.id, {
		onDelete: "set null",
	}),
	// MEMBER INFO UPDATE START: Added member personal information fields
	profile: jsonb("profile").$type<MemberLocationProfile>(),
	// MEMBER INFO UPDATE END
	botMetadata: jsonb("bot_metadata").default(sql`'{}'::jsonb`),
	lastBotInteraction: timestamp("last_bot_interaction", { withTimezone: true }),

},
	(t) => [primaryKey({ columns: [t.memberId, t.locationId] })]
);




export const locationsRelations = relations(locations, ({ many, one }) => ({
	memberLocations: many(memberLocations),
	integrations: many(integrations),
	programs: many(programs),
	memberPlans: many(memberPlans),
	memberSubscriptions: many(memberSubscriptions),
	memberInvoices: many(memberInvoices),
	pointsHistory: many(memberPointsHistory),
	referrals: many(memberReferrals),
	locationState: one(locationState, {
		fields: [locations.id],
		references: [locationState.locationId],
	}),
	vendor: one(vendors, {
		fields: [locations.vendorId],
		references: [vendors.id],
	}),
	wallet: one(wallets, {
		fields: [locations.id],
		references: [wallets.locationId],
	}),
	taxRates: many(taxRates),
}));

export const locationStateRelations = relations(locationState, ({ one }) => ({
	location: one(locations, {
		fields: [locationState.locationId],
		references: [locations.id],
	}),
}));

export const memberLocationsRelations = relations(
	memberLocations,
	({ one, many }) => ({
		member: one(members, {
			fields: [memberLocations.memberId],
			references: [members.id],
		}),
		location: one(locations, {
			fields: [memberLocations.locationId],
			references: [locations.id],
		}),
		transactions: many(transactions),
		attendances: many(attendances),
		pointsHistory: many(memberPointsHistory, {
			relationName: 'pointsHistory',
		}),
		memberPaymentMethods: many(memberPaymentMethods, {
			relationName: 'memberPaymentMethods',

		}),
	})
);

export const walletRelations = relations(wallets, ({ one, many }) => ({
	location: one(locations, {
		fields: [wallets.locationId],
		references: [locations.id],
	}),
	usages: many(walletUsages, { relationName: "usages" }),
}));

