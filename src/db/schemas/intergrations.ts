import { relations } from "drizzle-orm";
import { integer, boolean, primaryKey, varchar, serial, text, timestamp, pgTable, jsonb, json } from "drizzle-orm/pg-core";
import { vendors } from "./users";
import { locations } from "./locations";


export const integrations = pgTable("integrations", {
    id: integer("id").primaryKey(),
    vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    service: varchar("service").notNull(),
    apiKey: varchar("api_key"),
    secretKey: varchar("secret_key"),
    accessToken: varchar("access_token"),
    refreshToken: varchar("refresh_token"),
    additionalSettings: json("additional_settings"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});

export const integrationRelations = relations(integrations, ({ one }) => ({
    vendor: one(vendors, {
        fields: [integrations.vendorId],
        references: [vendors.id],
    }),
    location: one(locations, {
        fields: [integrations.locationId],
        references: [locations.id],
    }),
}));
