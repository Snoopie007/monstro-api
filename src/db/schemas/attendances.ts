import { relations } from "drizzle-orm";
import { serial, timestamp, pgTable, text, integer } from "drizzle-orm/pg-core";
import { recurringReservations, reservations } from "./reservations";

export const attendances = pgTable("check_ins", {
  id: serial("id").primaryKey(),
  reservationId: text("reservation_id").references(() => reservations.id, {
    onDelete: "cascade",
  }),
  recurringId: text("recurring_id").references(
    () => recurringReservations.id,
    { onDelete: "cascade" }
  ),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  checkInTime: timestamp("check_in_time", { withTimezone: true })
    .notNull()
    .defaultNow(),
  checkOutTime: timestamp("check_out_time", { withTimezone: true }),
  ipAddress: text("ip_address"),
  macAddress: text("mac_address"),
  lat: integer("lat"),
  lng: integer("lng"),
  created: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
});

export const attendancesRelations = relations(attendances, ({ one }) => ({
  reservation: one(reservations, {
    fields: [attendances.reservationId],
    references: [reservations.id],
  }),
  recurring: one(recurringReservations, {
    fields: [attendances.recurringId],
    references: [recurringReservations.id],
  }),
}));
