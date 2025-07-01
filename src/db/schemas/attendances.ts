<<<<<<< HEAD
import { relations } from "drizzle-orm";
import { timestamp, pgTable, text, integer, uuid } from "drizzle-orm/pg-core";
import { recurringReservations, reservations } from "./reservations";

export const attendances = pgTable("check_ins", {
    id: uuid("id").primaryKey(),
    reservationId: text("reservation_id").references(() => reservations.id, { onDelete: "cascade" }),
    recurringId: text("recurring_id").references(() => recurringReservations.id, { onDelete: "cascade" }),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    checkInTime: timestamp("check_in_time", { withTimezone: true }).notNull().defaultNow(),
    checkOutTime: timestamp("check_out_time", { withTimezone: true }),
    ipAddress: text("ip_address"),
    macAddress: text("mac_address"),
    lat: integer("lat"),
    lng: integer("lng"),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deleted: timestamp("deleted_at", { withTimezone: true }),
=======
import {relations} from "drizzle-orm";
import {serial, timestamp, pgTable, text, integer} from "drizzle-orm/pg-core";
import {recurringReservations, reservations} from "./reservations";

export const attendances = pgTable("check_ins", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservation_id").references(() => reservations.id, {
    onDelete: "cascade",
  }),
  recurringId: integer("recurring_id").references(
    () => recurringReservations.id,
    {onDelete: "cascade"}
  ),
  startTime: timestamp("start_time", {withTimezone: true}).notNull(),
  endTime: timestamp("end_time", {withTimezone: true}).notNull(),
  checkInTime: timestamp("check_in_time", {withTimezone: true})
    .notNull()
    .defaultNow(),
  checkOutTime: timestamp("check_out_time", {withTimezone: true}),
  ipAddress: text("ip_address"),
  macAddress: text("mac_address"),
  lat: integer("lat"),
  lng: integer("lng"),
  created: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
  updated: timestamp("updated_at", {withTimezone: true}),
>>>>>>> 22125ebf9f92d05da0f1397f845bbaa8d79a1fe6
});

export const attendancesRelations = relations(attendances, ({one}) => ({
  reservation: one(reservations, {
    fields: [attendances.reservationId],
    references: [reservations.id],
  }),
  recurring: one(recurringReservations, {
    fields: [attendances.recurringId],
    references: [recurringReservations.id],
  }),
}));
