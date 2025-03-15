import { boolean, date, bigint, pgTable, serial, timestamp, text, integer } from "drizzle-orm/pg-core";
import { locations } from "./locations";

export const importMembers = pgTable("import_members", {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    lastRenewalDay: date("last_renewal_day").notNull(),
    status: text("status").notNull().default("Active"),
    terms: text("terms").notNull().default("months"),
    termCount: integer("term_count").notNull(),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
    programId: integer("program_id"),
    planId: integer("plan_id"),
    processed: boolean("processed").notNull().default(false),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
});
