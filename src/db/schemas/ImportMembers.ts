import { boolean, date, bigint, pgTable, serial, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { locations } from "./locations";

export const importMembers = pgTable("import_members", {
    id: serial("id").primaryKey(),
    firstName: varchar("first_name", { length: 255 }).notNull(),
    lastName: varchar("last_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 255 }),
    lastRenewalDay: date("last_renewal_day").notNull(),
    status: varchar("status", { length: 255 }).notNull().default("Active"),
    terms: varchar("terms", { length: 255 }).notNull().default("months"),
    termCount: integer("term_count").notNull(),
    created: timestamp("created_at", { withTimezone: false }),
    updated: timestamp("updated_at", { withTimezone: false }),
    programId: integer("program_id"),
    planId: integer("plan_id"),
    processed: boolean("processed").notNull().default(false),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
});
