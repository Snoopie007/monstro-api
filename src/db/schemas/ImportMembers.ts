import { boolean, date, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { locations } from "./locations";

export const importMembers = pgTable("import_members", {
    id: serial("id").primaryKey(),
    firstName: varchar("first_name").notNull(),
    lastName: varchar("last_name").notNull(),
    email: varchar("email").notNull(),
    phone: varchar("phone"),
    lastRenewalDay: date("last_renewal_day").notNull(),
    status: varchar('status').notNull().default("active"),
    terms: varchar('terms').notNull(),
    termCount: integer('term_count').notNull(),
    programId: integer('program_id'),
    planId: integer('plan_id'),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    processed: boolean('processed').default(false),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});
