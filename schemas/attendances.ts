import { relations } from "drizzle-orm";
import { serial, timestamp, pgTable, text, integer } from "drizzle-orm/pg-core";
import { reservations } from "./reservations";
import { locations, memberLocations } from "./locations";
import { members } from "./members";
import { programs } from "./programs";

export const attendances = pgTable("check_ins", {
	id: serial("id").primaryKey(),
	reservationId: text("reservation_id").references(() => reservations.id, {
		onDelete: "set null",
	}),
	programId: text("program_id").references(() => programs.id, {
		onDelete: "set null",
	}),
	programName: text("program_name"),
	locationId: text("location_id").notNull().references(() => locations.id, {
		onDelete: "cascade",
	}),
	memberId: text("member_id").notNull().references(() => members.id, {
		onDelete: "cascade",
	}),
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
	program: one(programs, {
		fields: [attendances.programId],
		references: [programs.id],
	}),
	location: one(locations, {
		fields: [attendances.locationId],
		references: [locations.id],
	}),
	member: one(members, {
		fields: [attendances.memberId],
		references: [members.id],
	}),
	memberLocation: one(memberLocations, {
		fields: [attendances.memberId, attendances.locationId],
		references: [memberLocations.memberId, memberLocations.locationId],
	}),
}));
