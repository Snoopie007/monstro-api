import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { SalesStatusEnum } from "./AdminEnums";
import { adminUsers } from "./AdminUsers";
import { relations } from "drizzle-orm";

export const sales = pgTable("sales", {
    id: serial("id").primaryKey().notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    locationId: text("location_id"),
    userId: integer("user_id"),
    planId: integer("plan_id"),
    packageId: integer("package_id"),
    paymentId: integer("payment_id"),
    coupon: text("coupon"),
    stripeCustomerId: text("stripe_customer_id"),
    agreedToTerms: boolean("agreed_to_terms").notNull().default(false),
    closedOn: timestamp("closed_on"),
    status: SalesStatusEnum("status").notNull().default('Pending'),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});

export const salesTransactions = pgTable("sales_transactions", {
    id: serial("id").primaryKey(),
    salesId: integer("sales_id").references(() => sales.id).notNull(),
    total: integer("total").notNull(),
    tax: integer("tax").notNull().default(0),
    subTotal: integer("sub_total").notNull(),
    stripeInvoiceId: text("stripe_invoice_id").notNull(),
    stripeFee: integer("stripe_fee").default(0),
    discounts: jsonb("discounts").$type<Array<Record<string, any>>>().default([]),
    invoiceUrl: text("invoice_url"),
    status: text("status").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});

export const salesTransactionsRelations = relations(salesTransactions, ({ one }) => ({
    sales: one(sales, {
        fields: [salesTransactions.salesId],
        references: [sales.id],
    }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
    user: one(adminUsers, {
        fields: [sales.userId],
        references: [adminUsers.id],
    }),
    transactions: many(salesTransactions),
}));

