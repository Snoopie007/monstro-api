import { relations, sql } from "drizzle-orm";
import { integer, primaryKey, serial, text, timestamp, pgTable, boolean, varchar, pgEnum, jsonb, uuid, doublePrecision } from "drizzle-orm/pg-core";
import { locations, memberLocations } from "./locations";
import { users } from "./users";
import { achievements } from "./achievements";
import { rewards } from "./rewards";
import { programMembers } from "./programs";
import { contractTemplates } from "./ContractTemplates";
import { memberPackages, memberPlans } from "./MemberPlans";
import { memberSubscriptions } from "./MemberPlans";
import { InvoiceStatusEnum, MemberRelationshipEnum } from "./enums";



export const members = pgTable("members", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    referralCode: text("referral_code").notNull(),
    currentPoints: integer("current_points").notNull().default(0),
    gender: text("gender"),
    dob: timestamp("dob"),
    avatar: varchar("avatar"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true }),
});

export const memberAchievements = pgTable("member_achievements", {
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
    achievementId: integer("achievement_id").references(() => achievements.id, { onDelete: "cascade" }),
    note: text("note"),
    status: text("status"),
    progress: integer("progress"),
    dateAchieved: timestamp("date_achieved", { withTimezone: true }).notNull().defaultNow(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.memberId, t.achievementId] })]);

export const memberRewards = pgTable("member_rewards", {
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    rewardId: integer("reward_id").references(() => rewards.id, { onDelete: "cascade" }),
    previousPoints: integer("previous_points"),
    status: text("status"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.memberId, t.locationId, t.rewardId] })]);

export const memberContracts = pgTable("member_contracts", {
    id: serial("id").primaryKey(),
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
    templateId: integer("contract_id").references(() => contractTemplates.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    memberPlanId: integer("member_plan_id").references(() => memberPlans.id, { onDelete: "cascade" }),
    signature: text("signature"),
    variables: jsonb("variables").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    signed: boolean("signed").notNull().default(false),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true }),
});

export const memberInvoices = pgTable("member_invoices", {
    id: uuid("id").defaultRandom().primaryKey(),
    settings: jsonb("settings").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    currency: text("currency"),
    memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    memberPackageId: uuid("member_package_id").references(() => memberPackages.id, { onDelete: "cascade" }),
    memberSubscriptionId: integer("member_subscription_id").references(() => memberSubscriptions.id, { onDelete: "cascade" }),
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
    status: InvoiceStatusEnum("status").notNull().default('draft'),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});

export const familyMembers = pgTable("family_members", {
    id: serial("id").primaryKey(),
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
    relatedMemberId: integer("related_member_id").references(() => members.id, { onDelete: "cascade" }),
    relationship: MemberRelationshipEnum("relationship").notNull().default('other'),
    isPayer: boolean("is_payer").notNull().default(false),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true }),
});

export const membersRelations = relations(members, ({ many, one }) => ({
    memberLocations: many(memberLocations),
    achievements: many(memberAchievements),
    rewards: many(memberRewards),
    contracts: many(memberContracts),
    programMembers: many(programMembers),
    subscriptions: many(memberSubscriptions, { relationName: "beneficiary" }),
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
    payers: many(memberSubscriptions, {
        relationName: "payer",
    }),
    packages: many(memberPackages, {
        relationName: "packageBeneficiary",
    }),
    packagePayers: many(memberPackages, {
        relationName: "packagePayer",
    }),
}));

export const familyMemberRelations = relations(familyMembers, ({ one, many }) => ({
    member: one(members, {
        relationName: "memberFamilyMembers",
        fields: [familyMembers.memberId],
        references: [members.id],
    }),
    relatedMember: one(members, {
        relationName: "relatedMemberFamily",
        fields: [familyMembers.relatedMemberId],
        references: [members.id],
    })

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
}));



export const memberContractsRelations = relations(memberContracts, ({ many, one }) => ({
    member: one(members, {
        fields: [memberContracts.memberId],
        references: [members.id],
    }),
    plan: one(memberPlans, {
        fields: [memberContracts.memberPlanId],
        references: [memberPlans.id],
    }),
    contractTemplate: one(contractTemplates, {
        fields: [memberContracts.templateId],
        references: [contractTemplates.id],
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
    location: one(locations, {
        fields: [memberInvoices.locationId],
        references: [locations.id],
    }),
}));
