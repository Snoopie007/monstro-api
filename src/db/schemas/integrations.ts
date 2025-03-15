import { relations } from "drizzle-orm";
import { integer, primaryKey, serial, text, timestamp, pgTable, json } from "drizzle-orm/pg-core";
import { vendors } from "./vendors";
import { locations } from "./locations";

export const integrations = pgTable("integrations", {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    service: text("service").notNull(),
    apiKey: text("api_key"),
    secretKey: text("secret_key"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    integrationId: text("integration_id").notNull(),
    additionalSettings: json("additional_settings"),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
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
