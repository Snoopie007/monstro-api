import { relations } from "drizzle-orm";
import { integer, bigint, primaryKey, varchar, serial, text, timestamp, pgTable, json } from "drizzle-orm/pg-core";
import { vendors } from "./vendors";
import { locations } from "./locations";

export const integrations = pgTable("integrations", {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    service: text("service").notNull(),
    apiKey: varchar("api_key", { length: 255 }),
    secretKey: varchar("secret_key", { length: 255 }),
    accessToken: varchar("access_token", { length: 255 }),
    refreshToken: varchar("refresh_token", { length: 255 }),
    integrationId: varchar("integration_id", { length: 255 }).notNull(),
    additionalSettings: json("additional_settings"),
    created: timestamp("created_at", { withTimezone: false }),
    updated: timestamp("updated_at", { withTimezone: false }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
}, (t) => [
    primaryKey({ columns: [t.id] }), 
    primaryKey({ columns: [t.service, t.locationId] }) 
]);

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
