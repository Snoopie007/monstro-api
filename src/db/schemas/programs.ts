import { serial, text, timestamp, time, smallint, pgTable, integer, unique, boolean, bigint, primaryKey } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations } from "drizzle-orm";
import { memberPackages, memberPlans, memberSubscriptions } from "./MemberPlans";
import { reservations } from "./reservations";
import { staffs } from "./staffs";
import { PlanInterval, ProgramStatusEnum } from "./DatabaseEnums";

export const programs = pgTable("programs", {
    id: bigint("id", { mode: "bigint" }).primaryKey().notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    icon: text("icon"),
    capacity: integer("capacity").notNull(),
    minAge: integer("min_age").notNull(),
    maxAge: integer("max_age").notNull(),
    locationId: bigint("location_id", { mode: "bigint" }).notNull().references(() => locations.id, { onDelete: "cascade" }),
    instructorId: bigint("instructor_id", { mode: "bigint" }).references(() => staffs.id, { onDelete: "set null" }),
    interval: PlanInterval("interval").notNull().default("week"),
    intervalThreshold: smallint("interval_threshold").notNull().default(1),
    status: ProgramStatusEnum("status").notNull().default("active"),
    cancelationThreshold: integer("cancelation_threshold").notNull().default(24),
    allowWaitlist: boolean("allow_waitlist").notNull().default(false),
    waitlistCapacity: integer("waitlist_capacity").notNull().default(0),
    allowMakeUpClass: boolean("allow_make_up_class").notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const planPrograms = pgTable("plan_programs", {
    planId: integer("plan_id").notNull().references(() => memberPlans.id, { onDelete: "cascade" }),
    programId: integer("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.planId, t.programId] })]);


export const programSessions = pgTable("program_sessions", {
    id: serial("id").primaryKey(),
    programId: integer("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
    time: time("time").notNull(),
    duration: smallint("duration").notNull().default(0),
    day: smallint("day").notNull().default(1),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
}, (t) => [unique("unique_program_session").on(t.programId, t.time, t.duration, t.day)]);



export const programsRelations = relations(programs, ({ one, many }) => ({
    location: one(locations, {
        fields: [programs.locationId],
        references: [locations.id],
    }),
    plans: many(memberPlans),
    sessions: many(programSessions),
    instructor: one(staffs, {
        fields: [programs.instructorId],
        references: [staffs.id],
    }),
    memberSubscriptions: many(memberSubscriptions),
    memberPackages: many(memberPackages),
}));


export const programSessionsRelations = relations(programSessions, ({ one, many }) => ({
    program: one(programs, {
        fields: [programSessions.programId],
        references: [programs.id],
    }),
    reservations: many(reservations),
}));


export const planProgramsRelations = relations(planPrograms, ({ one }) => ({
    plan: one(memberPlans, {
        fields: [planPrograms.planId],
        references: [memberPlans.id],
    }),
    program: one(programs, {
        fields: [planPrograms.programId],
        references: [programs.id],
    }),

}));