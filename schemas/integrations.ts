import { relations, sql } from "drizzle-orm";
import { integer, primaryKey, text, timestamp, pgTable, unique, jsonb, uuid } from "drizzle-orm/pg-core";
import { locations } from "./locations";


export const integrations = pgTable("integrations", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    service: text("service").notNull(),
    apiKey: text("api_key"),
    secretKey: text("secret_key"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accountId: text("account_id").notNull(),
    expires: integer("expires_at"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    primaryKey({ columns: [t.id] }),
    unique("location_service_unique").on(t.locationId, t.service)
]);

export const integrationRelations = relations(integrations, ({ one }) => ({
    location: one(locations, {
        fields: [integrations.locationId],
        references: [locations.id],
    }),
}));
