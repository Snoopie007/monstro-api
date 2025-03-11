import { relations } from "drizzle-orm";
import { integer, boolean, primaryKey, varchar, serial, text, timestamp, pgTable, jsonb, json } from "drizzle-orm/pg-core";
import { vendors } from "./vendors";
import { locations } from "./locations";


export const integrations = pgTable("integrations", {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    integrationId: text("integration_id"),
    service: varchar("service").notNull(),
    apiKey: text("api_key"),
    secretKey: text("secret_key"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    additionalSettings: json("additional_settings"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.locationId, t.service] })]);

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
