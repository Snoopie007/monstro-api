import { relations } from "drizzle-orm";
import { bigint, serial, timestamp, pgTable, text, integer } from "drizzle-orm/pg-core";
import { reservations } from "./reservations";

export const attendances = pgTable("check_ins", {
    id: serial("id").primaryKey(),
    reservationId: integer("reservation_id").references(() => reservations.id, { onDelete: "cascade" }).notNull(),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    checkInTime: timestamp("check_in_time", { withTimezone: true }).notNull().defaultNow(),
    checkOutTime: timestamp("check_out_time", { withTimezone: true }),
    created: timestamp("created_at", { withTimezone: false }),
    updated: timestamp("updated_at", { withTimezone: false }),
    deleted: timestamp("deleted_at", { withTimezone: false }),
    ipAddress: text("ip_address"),
    macAddress: text("mac_address"),
    lat: integer("lat"),
    lng: integer("lng"),
});

export const attendancesRelations = relations(attendances, ({ one }) => ({
    reservation: one(reservations, {
        fields: [attendances.reservationId],
        references: [reservations.id],
    }),
}));
