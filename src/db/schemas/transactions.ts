import { integer, numeric, serial, text, timestamp, pgTable, doublePrecision, jsonb, boolean, pgEnum, uuid } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations, sql } from "drizzle-orm";
import { memberInvoices, members } from "./members";
import { memberPackages, memberSubscriptions } from "./MemberPlans";

const transactionStatus = pgEnum("transaction_status", ["paid", "failed", "incomplete"]);

export const transactions = pgTable("transactions", {
    id: serial("id").primaryKey(),
    description: text("description"),
    item: text("item").notNull(),
    transactionType: text("transaction_type").notNull(),
    paymentType: text("payment_type").notNull(),
    paymentMethod: text("payment_method").notNull(),
    amount: integer("amount").notNull().default(0),
    status: transactionStatus("status").notNull().default("incomplete"),
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    invoiceId: integer("invoice_id").unique().references(() => memberInvoices.id, { onDelete: "cascade" }),
    subscriptionId: integer("subscription_id").references(() => memberSubscriptions.id, { onDelete: "cascade" }),
    packageId: uuid("package_id").references(() => memberPackages.id, { onDelete: "cascade" }),
    chargeDate: timestamp("charge_date", { withTimezone: true }).notNull(),
    currency: text("currency").notNull().default("USD"),
    metadata: jsonb("metadata").$type<Record<string, any>>().notNull().default(sql`'{}'::jsonb`),
    refunded: boolean("refunded").notNull().default(false),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
    deleted: timestamp("deleted_at", { withTimezone: true }),
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

