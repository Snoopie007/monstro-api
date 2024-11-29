
import { relations } from "drizzle-orm";
import { bigint, integer, primaryKey, serial, text, timestamp, pgTable, boolean } from "drizzle-orm/pg-core";
import { memberLocations } from "./locations";


export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("email_verified_at", { mode: "date" }),
    password: text('password').notNull(),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true }),
});




export const vendors = pgTable("vendors", {
    id: serial("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    stripeCustomerId: text("stripe_customer_id"),
    phone: text("phone_number"),
    companyName: text("company_name"),
    companyEmail: text("company_email").unique(),
    companyWebsite: text("company_website"),
    companyAddress: text("company_address"),
    logo: text("logo"),
    monstroPlanId: integer("plan_id"),
    isNew: boolean("is_new").notNull().default(true),
    userId: integer("users_id").references(() => users.id, { onDelete: "cascade" }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true }),
});

