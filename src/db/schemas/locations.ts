

import { relations } from "drizzle-orm";
import { integer, boolean, primaryKey, varchar, serial, text, timestamp, pgTable, jsonb } from "drizzle-orm/pg-core";
import { members } from "./members";
import { integrations } from "./intergrations";
import { programs } from "./programs";
import { transactions } from "./transactions";
import { vendors } from "./vendors";

export const locations = pgTable("locations", {
    id: serial("id").primaryKey(),
    name: text("name"),
    industry: varchar("industry"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    website: text("website"),
    country: text("country"),
    phone: text("phone"),
    timezone: varchar("timezone"),
    logoUrl: text("logo_url"),
    status: text("status").notNull().default("Inactive"),
    metadata: jsonb("meta_data").$type<Record<string, any>>(),
    vendorId: integer("vendor_id").notNull().references(() => vendors.id),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});


export const memberLocations = pgTable("member_locations", {
    memberId: integer("member_id").notNull().references(() => members.id),
    locationId: integer("location_id").notNull().references(() => locations.id),
    stripeCustomerId: varchar("stripe_customer_id"),
    created: timestamp('created_at', { withTimezone: true }),
    updated: timestamp('updated_at', { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.memberId, t.locationId] })]);


export const locationsRelations = relations(locations, ({ many, one }) => ({
    memberLocations: many(memberLocations),
    integrations: many(integrations),
    programs: many(programs),
    vendor: one(vendors, {
        fields: [locations.vendorId],
        references: [vendors.id],
    })
}));


export const memberLocationsRelations = relations(memberLocations, ({ one, many }) => ({
    member: one(members, {
        fields: [memberLocations.memberId],
        references: [members.id],
    }),
    location: one(locations, {
        fields: [memberLocations.locationId],
        references: [locations.id],
    }),
    transactions: many(transactions),
}));

