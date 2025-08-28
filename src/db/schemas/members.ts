/* eslint-disable @typescript-eslint/no-explicit-any */
import { relations, sql } from "drizzle-orm";
import {
	integer,
	primaryKey,
	text,
	timestamp,
	pgTable,
	boolean,
	jsonb,
	uuid,
	unique,
} from "drizzle-orm/pg-core";
import { locations, memberLocations } from "./locations";
import { users } from "./users";
import { achievements } from "./achievements";
import { rewards } from "./rewards";
import { contractTemplates } from "./contracts";
import { memberPackages } from "./MemberPlans";
import { memberSubscriptions } from "./MemberPlans";
import { InvoiceStatusEnum, MemberRelationshipEnum } from "./DatabaseEnums";

export const members = pgTable("members", {
	id: uuid("id").primaryKey()
		.notNull()
		.default(sql`uuid_base62()`),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	firstName: text("first_name").notNull(),
	lastName: text("last_name"),
	email: text("email").notNull(),
	phone: text("phone").notNull(),
	referralCode: text("referral_code").notNull(),
	gender: text("gender"),
	dob: timestamp("dob", { withTimezone: true, mode: "date" }).default(
		sql`NULL`
	),
	avatar: text("avatar"),
	stripeCustomerId: text("stripe_customer_id"),
	created: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const memberAchievements = pgTable("member_achievements", {
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	achievementId: text("achievement_id").notNull().references(() => achievements.id, { onDelete: "cascade" }),
	progress: integer("progress").default(0),
	dateAchieved: timestamp("date_achieved", { withTimezone: true }).notNull().defaultNow(),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
},
	(t) => [primaryKey({ columns: [t.memberId, t.locationId, t.achievementId] })]
);

export const memberPointsHistory = pgTable("member_points_history", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	points: integer("points").notNull().default(0),
	achievementId: text("achievement_id").references(() => achievements.id, { onDelete: "cascade" }),
	type: text("type").notNull(),
	removed: boolean("removed").notNull().default(false),
	removedReason: text("removed_reason"),
	removedOn: timestamp("removed_on", { withTimezone: true }),
	created: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const memberReferrals = pgTable("member_referrals", {
	memberId: text("member_id")
		.notNull()
		.references(() => members.id, { onDelete: "cascade" }),
	referredMemberId: text("referred_member_id")
		.notNull()
		.references(() => members.id, { onDelete: "cascade" }),
	locationId: text("location_id")
		.notNull()
		.references(() => locations.id, { onDelete: "cascade" }),
	created: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	primaryKey({ columns: [t.memberId, t.referredMemberId, t.locationId] }),
	unique("unique_referred_member_location").on(
		t.referredMemberId,
		t.locationId,
		t.memberId
	)
]);

export const memberRewards = pgTable("reward_claims", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	rewardId: text("reward_id").notNull().references(() => rewards.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	previousPoints: integer("previous_points"),
	dateClaimed: timestamp("date_claimed", { withTimezone: true }).notNull().defaultNow(),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.id] })]);

export const memberContracts = pgTable("member_contracts", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	templateId: text("contract_id").notNull().references(() => contractTemplates.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	signature: text("signature"),
	pdfFilename: text("pdf_filename"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const memberInvoices = pgTable("member_invoices", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
	currency: text("currency"),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	memberPackageId: text("member_package_id").references(() => memberPackages.id, { onDelete: "cascade" }),
	memberSubscriptionId: text("member_subscription_id").references(() => memberSubscriptions.id, { onDelete: "cascade" }),
	description: text("description"),
	items: jsonb("items").$type<Record<string, any>>().array().default(sql`'{}'::jsonb[]`),
	paid: boolean("paid").notNull().default(false),
	tax: integer("tax").notNull().default(0),
	total: integer("total").notNull().default(0),
	discount: integer("discount").notNull().default(0),
	subtotal: integer("subtotal").notNull().default(0),
	forPeriodStart: timestamp("for_period_start", { withTimezone: true }),
	forPeriodEnd: timestamp("for_period_end", { withTimezone: true }),
	dueDate: timestamp("due_date", { withTimezone: true }).notNull().defaultNow(),
	attemptCount: integer("attempt_count").notNull().default(0),
	invoicePdf: text("invoice_pdf"),
	status: InvoiceStatusEnum("status").notNull().default("draft"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const familyMembers = pgTable("family_members", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	relatedMemberId: text("related_member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	relationship: MemberRelationshipEnum("relationship").notNull().default("other"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const membersRelations = relations(members, ({ many, one }) => ({
	memberLocations: many(memberLocations),
	achievements: many(memberAchievements),
	rewards: many(memberRewards),
	contracts: many(memberContracts),
	user: one(users, {
		fields: [members.userId],
		references: [users.id],
	}),
	familyMembers: many(familyMembers, {
		relationName: "memberFamilyMembers",
	}),
	relatedByFamily: many(familyMembers, {
		relationName: "relatedMemberFamily",
	}),
	packages: many(memberPackages),
	subscriptions: many(memberSubscriptions),
	pointsHistory: many(memberPointsHistory),
	referrals: many(memberReferrals),
	referredBy: one(memberReferrals, {
		relationName: "referredByMember",
		fields: [members.id],
		references: [memberReferrals.referredMemberId],
	}),
}));

export const familyMemberRelations = relations(familyMembers, ({ one }) => ({
	member: one(members, {
		relationName: "memberFamilyMembers",
		fields: [familyMembers.memberId],
		references: [members.id],
	}),
	relatedMember: one(members, {
		relationName: "relatedMemberFamily",
		fields: [familyMembers.relatedMemberId],
		references: [members.id],
	}),
}));

export const memberAchievementsRelations = relations(memberAchievements, ({ one }) => ({
	member: one(members, {
		fields: [memberAchievements.memberId],
		references: [members.id],
	}),
	achievement: one(achievements, {
		fields: [memberAchievements.achievementId],
		references: [achievements.id],
	}),
	memberLocation: one(memberLocations, {
		fields: [memberAchievements.memberId, memberAchievements.locationId],
		references: [memberLocations.memberId, memberLocations.locationId],
	}),
}));

export const memberPointsHistoryRelations = relations(memberPointsHistory, ({ one }) => ({
	member: one(members, {
		fields: [memberPointsHistory.memberId],
		references: [members.id],
	}),
	location: one(locations, {
		fields: [memberPointsHistory.locationId],
		references: [locations.id],
	}),
	achievement: one(achievements, {
		fields: [memberPointsHistory.achievementId],
		references: [achievements.id],
	}),
	memberLocation: one(memberLocations, {
		fields: [memberPointsHistory.memberId, memberPointsHistory.locationId],
		references: [memberLocations.memberId, memberLocations.locationId],
	}),
}));

export const memberContractsRelations = relations(memberContracts, ({ one }) => ({
	member: one(members, {
		fields: [memberContracts.memberId],
		references: [members.id],
	}),
	contractTemplate: one(contractTemplates, {
		fields: [memberContracts.templateId],
		references: [contractTemplates.id],
	}),
	location: one(locations, {
		fields: [memberContracts.locationId],
		references: [locations.id],
	}),
	memberSubscription: one(memberSubscriptions, {
		fields: [memberContracts.id],
		references: [memberSubscriptions.memberContractId],
	}),
	memberPackage: one(memberPackages, {
		fields: [memberContracts.id],
		references: [memberPackages.memberContractId],
	}),
}));

export const memberInvoicesRelations = relations(memberInvoices, ({ one }) => ({
	member: one(members, {
		fields: [memberInvoices.memberId],
		references: [members.id],
	}),
	subscription: one(memberSubscriptions, {
		fields: [memberInvoices.memberSubscriptionId],
		references: [memberSubscriptions.id],
	}),
	package: one(memberPackages, {
		fields: [memberInvoices.memberPackageId],
		references: [memberPackages.id],
	}),
	location: one(locations, {
		fields: [memberInvoices.locationId],
		references: [locations.id],
	}),
}));

export const memberRewardRelations = relations(memberRewards, ({ one }) => ({
	reward: one(rewards, {
		fields: [memberRewards.rewardId],
		references: [rewards.id],
	}),
	member: one(members, {
		fields: [memberRewards.memberId],
		references: [members.id],
	}),
	memberLocation: one(memberLocations, {
		fields: [memberRewards.memberId, memberRewards.locationId],
		references: [memberLocations.memberId, memberLocations.locationId],
	}),
}));

export const memberReferralsRelations = relations(memberReferrals, ({ one }) => ({
	member: one(members, {
		fields: [memberReferrals.memberId],
		references: [members.id],
	}),
	referredMember: one(members, {
		fields: [memberReferrals.referredMemberId],
		references: [members.id],
	}),
	location: one(locations, {
		fields: [memberReferrals.locationId],
		references: [locations.id],
	}),
	memberLocation: one(memberLocations, {
		fields: [memberReferrals.memberId, memberReferrals.locationId],
		references: [memberLocations.memberId, memberLocations.locationId],
	}),
}));
