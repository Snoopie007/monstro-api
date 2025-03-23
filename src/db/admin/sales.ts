import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { SalesStatusEnum } from "./AdminEnums";

export const sales = pgTable("sales", {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    locationId: integer("location_id"),
    userId: integer("user_id"),
    planId: integer("plan_id"),
    packageId: integer("package_id"),
    paymentId: integer("payment_id"),
    agreeToTerms: boolean("agree_to_terms").notNull().default(false),
    stripeCustomerId: text("stripe_customer_id"),
    closedOn: timestamp("closed_on"),
    status: SalesStatusEnum("status").notNull().default('Pending'),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});

