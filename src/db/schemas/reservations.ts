
import { relations } from "drizzle-orm";
import { integer, serial, timestamp, pgTable } from "drizzle-orm/pg-core";
import { programSessions } from "./programs";
import { members } from "./members";
import { attendances } from "./attendances";


export const reservations = pgTable("reservations", {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").references(() => programSessions.id, { onDelete: "cascade" }),
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
    status: integer("status"),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});


export const reservationsRelations = relations(reservations, ({ one, many }) => ({
    attendances: many(attendances),
    session: one(programSessions, {
        fields: [reservations.sessionId],
        references: [programSessions.id],
    }),
    member: one(members, {
        fields: [reservations.memberId],
        references: [members.id],
    })
}))

