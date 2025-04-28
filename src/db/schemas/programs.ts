import { bigserial, serial, text, timestamp, time, primaryKey, smallint, doublePrecision, pgTable, integer, unique } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations } from "drizzle-orm";
import { members } from "./members";
import { memberPackages, memberPlans, memberSubscriptions, planPrograms } from "./MemberPlans";
import { achievements } from "./achievements";
import { reservations } from "./reservations";
// Assuming staffs table exists
import { staffs } from "./staffs";
import { PlanInterval, ProgramStatusEnum } from "./DatabaseEnums";

export const programs = pgTable("programs", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    capacity: doublePrecision("capacity").notNull(),
    minAge: integer("min_age").notNull(),
    maxAge: integer("max_age").notNull(),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    instructorId: integer("instructor_id").references(() => staffs.id, { onDelete: "cascade" }),
    interval: PlanInterval("interval").notNull().default("week"),
    intervalThreshold: smallint("interval_threshold").notNull().default(1),
    icon: text("icon"),
    status: ProgramStatusEnum("status").notNull().default("active"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});


export const programSessions = pgTable("program_sessions", {
    id: serial("id").primaryKey(),
    programId: integer("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
    time: time("time").notNull(),
    duration: smallint("duration").notNull().default(0),
    day: smallint("day").notNull().default(1),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
}, (t) => [unique("unique_program_session").on(t.programId, t.time, t.duration, t.day)])

export const programsRelations = relations(programs, ({ one, many }) => ({
    location: one(locations, {
        fields: [programs.locationId],
        references: [locations.id],
    }),
    programPlans: many(planPrograms),
    achievements: many(achievements),
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
