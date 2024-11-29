
import { desc, relations } from "drizzle-orm";
import { integer, varchar, serial, timestamp, pgTable, jsonb, time } from "drizzle-orm/pg-core";
import { programLevels, programs } from "./programs";
import { members } from "./members";
import { attendances } from "./attendances";


export const enrollments = pgTable("reservations", {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").references(() => sessions.id, { onDelete: "cascade" }),
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
    status: varchar("status"),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});

export const sessions = pgTable("sessions", {
    id: serial("id").primaryKey(),
    programLevelId: integer("program_level_id").references(() => programLevels.id, { onDelete: "cascade" }),
    programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
    durationTime: integer("duration_time"),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    monday: time("monday"),
    tuesday: time("tuesday"),
    wednesday: time("wednesday"),
    thursday: time("thursday"),
    friday: time("friday"),
    saturday: time("saturday"),
    sunday: time("sunday"),
    status: varchar("status"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});


export const enrollmentsRelations = relations(enrollments, ({ one, many }) => ({
    attendances: many(attendances),
    session: one(sessions, {
        fields: [enrollments.sessionId],
        references: [sessions.id],
    }),
    member: one(members, {
        fields: [enrollments.memberId],
        references: [members.id],
    })
}))

export const sessionsRelations = relations(sessions, ({ one, many }) => ({

    program: one(programs, {
        fields: [sessions.programId],
        references: [programs.id],
    }),
    level: one(programLevels, {
        fields: [sessions.programLevelId],
        references: [programLevels.id],
    })
}))