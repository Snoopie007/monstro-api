import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { SalesStatusEnum } from "./AdminEnums";

export const sales = pgTable("sales", {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    locationId: text("location_id"),
    userId: integer("user_id"),
    planId: integer("plan_id"),
    packageId: integer("package_id"),
    paymentId: integer("payment_id"),
    stripeCustomerId: text("stripe_customer_id"),
    agreedToTerms: boolean("agreed_to_terms").notNull().default(false),
    closedOn: timestamp("closed_on"),
    coupon: text("coupon"),
    status: SalesStatusEnum("status").notNull().default('Pending'),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});



export const adminIntegrations = pgTable("admin_integrations", {
    id: serial("id").primaryKey(),
    service: text("service").notNull(),
    apiKey: text("api_key"),
    secretKey: text("secret_key"),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expires: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    providerId: text("provider_id").notNull(),
    settings: jsonb("settings").$type<Record<string, unknown>>(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true })
})
