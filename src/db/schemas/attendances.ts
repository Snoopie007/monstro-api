
import { desc, relations } from "drizzle-orm";
import { integer, serial, text, timestamp, pgTable } from "drizzle-orm/pg-core";

import { enrollments } from "./reservations";


export const attendances = pgTable("check_ins", {
    id: serial("id").primaryKey(),
    enrollmentId: integer("reservation_id").references(() => enrollments.id, { onDelete: "cascade" }),
    timeToCheckIn: timestamp("time_to_check_in", { withTimezone: true }),
    checkInTime: timestamp('check_in_time', { withTimezone: true }).notNull().defaultNow(),
    checkOutTIme: timestamp('check_out_time', { withTimezone: true }),

});

export const attendancesRelations = relations(attendances, ({ one, many }) => ({
    enrollment: one(enrollments, {
        fields: [attendances.enrollmentId],
        references: [enrollments.id],
    })
}))