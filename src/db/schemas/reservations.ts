
import { desc, relations, sql } from "drizzle-orm";
import { integer, varchar, serial, timestamp, pgTable, jsonb, time, text, boolean, pgEnum, smallint } from "drizzle-orm/pg-core";
import { programLevels, programs } from "./programs";
import { members } from "./members";
import { attendances } from "./attendances";


export const reservations = pgTable("reservations", {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").references(() => classSessions.id, { onDelete: "cascade" }),
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
    status: integer("status"),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});

export const classSessions = pgTable("class_sessions", {
    id: serial("id").primaryKey(),
    programLevelId: integer("program_level_id").references(() => programLevels.id, { onDelete: "cascade" }),
    programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
    durationTime: jsonb("duration_time").$type<Record<string, number>>().default(sql`'{}'::jsonb`),
    monday: time("monday"),
    tuesday: time("tuesday"),
    wednesday: time("wednesday"),
    thursday: time("thursday"),
    friday: time("friday"),
    saturday: time("saturday"),
    sunday: time("sunday"),
    status: smallint("status"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
    attendances: many(attendances),
    session: one(classSessions, {
        fields: [reservations.sessionId],
        references: [classSessions.id],
    }),
    member: one(members, {
        fields: [reservations.memberId],
        references: [members.id],
    })
}))

export const sessionsRelations = relations(classSessions, ({ one, many }) => ({

    program: one(programs, {
        fields: [classSessions.programId],
        references: [programs.id],
    }),
    level: one(programLevels, {
        fields: [classSessions.programLevelId],
        references: [programLevels.id],
    }),
    reservations: many(reservations)
}))