import {
    integer,
    text,
    timestamp,
    pgTable,
    boolean,
    uuid,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { sql } from "drizzle-orm";

export const taxRates = pgTable("tax_rates", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    name: text("name").notNull(),
    percentage: integer("percentage").notNull().default(0),
    description: text("description"),
    isDefault: boolean("is_default").notNull().default(false),
    country: text("country").notNull(),
    state: text("state").notNull(),
    status: text("status").notNull().default("inactive"),
    inclusive: boolean("inclusive").notNull().default(false),
    stripeRateId: text("stripe_rate_id"),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});