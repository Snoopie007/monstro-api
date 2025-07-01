import { integer, text, timestamp, pgTable, jsonb, boolean, uuid } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations, sql } from "drizzle-orm";
import { memberInvoices, members } from "./members";
import { memberPackages, memberSubscriptions } from "./MemberPlans";
import { TransactionStatusEnum, TransactionTypeEnum } from "./DatabaseEnums";



export const transactions = pgTable("transactions", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    description: text("description"),
    type: TransactionTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    taxAmount: integer("tax_amount").notNull().default(0),
    status: TransactionStatusEnum("status").notNull(),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    memberId: text("member_id").references(() => members.id, { onDelete: "cascade" }),
    paymentMethod: text("payment_method").notNull(),
    items: jsonb("items").array().default(sql`'{}'::jsonb[]`),
    chargeDate: timestamp("charge_date", { withTimezone: true }).defaultNow(),
    currency: text("currency").notNull().default("USD"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    refunded: boolean("refunded").notNull().default(false),
    invoiceId: text("invoice_id").references(() => memberInvoices.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => memberSubscriptions.id, { onDelete: "cascade" }),
    packageId: text("package_id").references(() => memberPackages.id, { onDelete: "cascade" })
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
    member: one(members, {
        fields: [transactions.memberId],
        references: [members.id],
    }),
    location: one(locations, {
        fields: [transactions.locationId],
        references: [locations.id],
    }),
    invoice: one(memberInvoices, {
        fields: [transactions.invoiceId],
        references: [memberInvoices.id],
    }),
    subscription: one(memberSubscriptions, {
        fields: [transactions.subscriptionId],
        references: [memberSubscriptions.id],
    }),
    package: one(memberPackages, {
        fields: [transactions.packageId],
        references: [memberPackages.id],
    }),
}));
