import { relations } from "drizzle-orm";
import { integer, primaryKey, serial, text, timestamp, pgTable, boolean, varchar, pgEnum } from "drizzle-orm/pg-core";
import { locations, memberLocations } from "./locations";
import { users } from "./users";
import { achievements } from "./achievements";
import { rewards } from "./rewards";
import { programMembers, programs } from "./programs";
import { contractsTemplates } from "./contract-templates";
import { plans } from "./plans";

export const members = pgTable("members", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    // parentId: integer("parent_id"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    email: text("email").notNull(),
    phone: text("phone"),
    referralCode: text("referral_code").notNull(),
    currentPoints: integer("current_points").notNull().default(0),
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

export const MemberRewards = pgTable("member_rewards", {
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    rewardId: integer("reward_id").references(() => rewards.id, { onDelete: "cascade" }),
    previousPoints: integer("previous_points"),
    status: text("status"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.memberId, t.locationId, t.rewardId] })]);

export const contracts = pgTable("member_contracts", {
    id: serial("id").primaryKey(),
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
    templateId: integer("contract_id").references(() => contractsTemplates.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    stripePlanId: text("stripe_plan_id"),
    content: text("content"),
    signed: boolean("signed").notNull().default(false),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true }),
});

export const relationEnum = pgEnum('relationship', [
    'parent',
    'spouse', 
    'child',
    'sibling',
    'other'
]);

export const familyMembers = pgTable("family_members", {
    id: serial("id").primaryKey(),
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
    relatedMemberId: integer("related_member_id").references(() => members.id, { onDelete: "cascade" }),
    relationship: relationEnum("relationship"),
    isPayer: boolean("is_payer").notNull().default(false),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true }),
});

export const memberPayments = pgTable("member_payments", {
    id: serial("id").primaryKey(),
    memberId: integer("payer_id").references(() => members.id, { onDelete: "cascade" }),
    beneficiaryId: integer("beneficiary_id").references(() => members.id, { onDelete: "cascade" }),
    programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
    planId: integer("stripe_plan_id").references(() => plans.id, { onDelete: "cascade" }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});

export const membersRelations = relations(members, ({ many, one }) => ({
    locations: many(memberLocations),
    achievements: many(memberAchievements),
    rewards: many(MemberRewards),
    contracts: many(contracts),
    programMembers: many(programMembers),
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
    paymentsMade: many(memberPayments, {
        relationName: "paymentsMade",
    }),
    paymentsReceived: many(memberPayments, {
        relationName: "paymentsReceived",
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

export const memberPaymentRelations = relations(memberPayments, ({ one }) => ({
    payer: one(members, {
        fields: [memberPayments.memberId],
        references: [members.id],
    }),
    beneficiary: one(members, {
        fields: [memberPayments.beneficiaryId],
        references: [members.id],
    }),
    program: one(programs, {
        fields: [memberPayments.programId],
        references: [programs.id],
    }),
    plan: one(plans, {
        fields: [memberPayments.planId],
        references: [plans.id],
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
}));

export const contractsRelations = relations(contracts, ({ many, one }) => ({
    member: one(members, {
        fields: [contracts.memberId],
        references: [members.id],
    }),
    plan: one(plans, {
        fields: [contracts.stripePlanId],
        references: [plans.id],
    }),
    contractTemplate: one(contractsTemplates, {
        fields: [contracts.templateId],
        references: [contractsTemplates.id],
    }),
}));
