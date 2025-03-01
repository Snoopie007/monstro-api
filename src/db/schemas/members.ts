import { relations } from "drizzle-orm";
import { integer, primaryKey, serial, text, timestamp, pgTable, boolean, varchar, pgEnum } from "drizzle-orm/pg-core";
import { locations, memberLocations } from "./locations";
import { users } from "./users";
import { achievements } from "./achievements";
import { rewards } from "./rewards";
import { programMembers, programs } from "./programs";
import { contractTemplates } from "./ContractTemplates";
import { memberPlans } from "./MemberPlans";



export const MemberRelationshipEnum = pgEnum('relationship', [
    'parent',
    'spouse',
    'child',
    'sibling',
    'other'
]);

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
    content: text("content"),
    signed: boolean("signed").notNull().default(false),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true }),
});

const MemberSubscriptionStatusEnum = pgEnum('member_subscription_status', [
    'active',
    'inactive',
    'canceled',
    'past_due',
    'incomplete',
    'trialing',
    'unpaid',
    'incomplete_expired',
    'paused'
]);

export const memberSubscriptions = pgTable("member_subscriptions", {
    id: serial("id").primaryKey(),
    payerId: integer("payer_id").references(() => members.id, { onDelete: "cascade" }),
    beneficiaryId: integer("beneficiary_id").references(() => members.id, { onDelete: "cascade" }),
    planId: integer("member_plan_id").references(() => memberPlans.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id"),
    status: MemberSubscriptionStatusEnum("status").notNull().default("incomplete"),
    activationDate: timestamp("activation_date", { withTimezone: true }).notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAt: timestamp("cancel_at", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});

export const familyMembers = pgTable("family_members", {
    id: serial("id").primaryKey(),
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
    relatedMemberId: integer("related_member_id").references(() => members.id, { onDelete: "cascade" }),
    relationship: MemberRelationshipEnum("relationship"),
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
    planId: integer("member_plan_id").references(() => memberPlans.id, { onDelete: "cascade" }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});

export const membersRelations = relations(members, ({ many, one }) => ({
    memberLocations: many(memberLocations),
    achievements: many(memberAchievements),
    rewards: many(memberRewards),
    contracts: many(memberContracts),
    programMembers: many(programMembers),
    subscriptions: many(memberSubscriptions),
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
    plan: one(memberPlans, {
        fields: [memberPayments.planId],
        references: [memberPlans.id],
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


export const memberSubscriptionRelations = relations(memberSubscriptions, ({ one }) => ({
    payer: one(members, {
        fields: [memberSubscriptions.payerId],
        references: [members.id],
    }),
    beneficiary: one(members, {
        fields: [memberSubscriptions.beneficiaryId],
        references: [members.id],
    }),
    plan: one(memberPlans, {
        fields: [memberSubscriptions.planId],
        references: [memberPlans.id],
    }),
    location: one(locations, {
        fields: [memberSubscriptions.locationId],
        references: [locations.id],
    }),
}));
