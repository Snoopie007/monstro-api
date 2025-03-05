import { integer, varchar, serial, text, timestamp, pgTable, time, primaryKey, smallint } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations } from "drizzle-orm";
import { members } from "./members";
import { memberPlans } from "./MemberPlans";
import { achievements } from "./achievements";
import { reservations } from "./reservations";

export const programs = pgTable("programs", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    icon: varchar("icon"),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});


export const programLevels = pgTable("program_levels", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    capacity: integer("capacity").notNull().default(0),
    minAge: integer("min_age").notNull().default(1),
    maxAge: integer("max_age").notNull().default(50),
    programId: integer("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
    parentId: integer("parent_id"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});



export const programMembers = pgTable("member_programs", {
    programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.memberId, t.programId] })])


export const programSessions = pgTable("program_sessions", {
    id: serial("id").primaryKey(),
    programLevelId: integer("program_level_id").references(() => programLevels.id, { onDelete: "cascade" }),
    programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
    time: time("time").notNull(),
    duration: integer("duration").notNull().default(0),
    day: text("day").notNull(),
    status: smallint("status"),
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
}))


export const programMembersRelations = relations(programMembers, ({ one, many }) => ({
    program: one(programs, {
        fields: [programMembers.programId],
        references: [programs.id],
    }),
    member: one(members, {
        fields: [programMembers.memberId],
        references: [members.id],
    }),
}))


export const programLevelsRelations = relations(programLevels, ({ one, many }) => ({
    program: one(programs, {
        fields: [programLevels.programId],
        references: [programs.id],
    }),
    sessions: many(programSessions),

}))

export const programSessionsRelations = relations(programSessions, ({ one, many }) => ({
    program: one(programs, {
        fields: [programSessions.programId],
        references: [programs.id],
    }),
    level: one(programLevels, {
        fields: [programSessions.programLevelId],
        references: [programLevels.id],
    }),
    reservations: many(reservations)
}))