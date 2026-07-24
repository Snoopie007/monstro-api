import { sql } from "drizzle-orm";
import { bigint, text, timestamp, pgTable, unique, jsonb } from "drizzle-orm/pg-core";
import { locations } from "./locations";


export const integrations = pgTable("integrations", {
    id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    service: text("service").notNull(),
    apiKey: text("api_key"),
    secretKey: text("secret_key"),
    webhookSignatureKey: text("webhook_signature_key"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accountId: text("account_id").notNull(),
    expires: bigint("expires_at", { mode: "number" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
    created: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
    unique("unique_service_location").on(t.service, t.locationId)
]);
