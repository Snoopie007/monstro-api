
import { desc, relations } from "drizzle-orm";
import { integer, serial, timestamp, pgTable } from "drizzle-orm/pg-core";

import { reservations } from "./reservations";


export const attendances = pgTable("check_ins", {
    id: serial("id").primaryKey(),
    reservationId: integer("reservation_id").references(() => reservations.id, { onDelete: "cascade" }),
    timeToCheckIn: timestamp("time_to_check_in", { withTimezone: true }),
    checkInTime: timestamp('check_in_time', { withTimezone: true }).notNull().defaultNow(),
    checkOutTIme: timestamp('check_out_time', { withTimezone: true }),

});

export const attendancesRelations = relations(attendances, ({ one, many }) => ({
    reservation: one(reservations, {
        fields: [attendances.reservationId],
        references: [reservations.id],
    })
}))