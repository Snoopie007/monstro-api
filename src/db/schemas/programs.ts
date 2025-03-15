import { bigserial, serial, text, timestamp, time, primaryKey, smallint, doublePrecision, pgTable, integer } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations } from "drizzle-orm";
import { members } from "./members";
import { memberPackages, memberPlans, memberSubscriptions } from "./MemberPlans";
import { achievements } from "./achievements";
import { reservations } from "./reservations";
// Assuming staffs table exists
import { staffs } from "./staffs";

export const programs = pgTable("programs", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});

export const programLevels = pgTable("program_levels", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    capacity: doublePrecision("capacity").notNull(),
    minAge: integer("min_age").notNull(),
    maxAge: integer("max_age").notNull(),
    programId: integer("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
    parentId: integer("parent_id"),
    instructorId: integer("instructor_id").references(() => staffs.id, { onDelete: "cascade" }),
    interval: text("interval").default("week"),
    intervalThreshold: smallint("interval_threshold").default(1),
    created: timestamp('created_at', { withTimezone: true }),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});

export const programMembers = pgTable("member_programs", {
    programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.memberId, t.programId] })]);

export const programSessions = pgTable("program_sessions", {
    id: serial("id").primaryKey(),
    programLevelId: integer("program_level_id").references(() => programLevels.id, { onDelete: "cascade" }),
    time: time("time").notNull(),
    duration: smallint("duration").notNull().default(0),
    day: smallint("day").notNull().default(1),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});

export const programsRelations = relations(programs, ({ one, many }) => ({
    location: one(locations, {
        fields: [programs.locationId],
        references: [locations.id],
    }),
    levels: many(programLevels),
    programMembers: many(programMembers),
    plans: many(memberPlans),
    achievements: many(achievements),
    sessions: many(programSessions),
}));

export const programMembersRelations = relations(programMembers, ({ one }) => ({
    program: one(programs, {
        fields: [programMembers.programId],
        references: [programs.id],
    }),
    member: one(members, {
        fields: [programMembers.memberId],
        references: [members.id],
    }),
}));

export const programLevelsRelations = relations(programLevels, ({ one, many }) => ({
    program: one(programs, {
        fields: [programLevels.programId],
        references: [programs.id],
    }),
    parentLevel: one(programLevels, {
        fields: [programLevels.parentId],
        references: [programLevels.id],
    }),
    instructor: one(staffs, {
        fields: [programLevels.instructorId],
        references: [staffs.id],
    }),
    sessions: many(programSessions),
    memberSubscriptions: many(memberSubscriptions),
    memberPackages: many(memberPackages),
}));

export const programSessionsRelations = relations(programSessions, ({ one, many }) => ({
    level: one(programLevels, {
        fields: [programSessions.programLevelId],
        references: [programLevels.id],
    }),
    reservations: many(reservations),
}));
