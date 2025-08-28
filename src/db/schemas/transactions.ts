import {
  integer,
  serial,
  text,
  timestamp,
  pgTable,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations, sql } from "drizzle-orm";
import { memberInvoices, members } from "./members";
import { memberPackages, memberSubscriptions } from "./MemberPlans";
import { TransactionStatusEnum, TransactionTypeEnum } from "./DatabaseEnums";

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  description: text("description"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: jsonb("items").$type<Record<string, any>>().array().default(sql`'{}'::jsonb[]`),
  type: TransactionTypeEnum("type").notNull(),
  paymentMethod: text("payment_method").notNull(),
  amount: integer("amount").notNull().default(0),
  status: TransactionStatusEnum("status").notNull().default("incomplete"),
  memberId: text("member_id").references(() => members.id, {
    onDelete: "cascade",
  }),
  locationId: text("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  invoiceId: text("invoice_id")
    .unique()
    .references(() => memberInvoices.id, { onDelete: "cascade" }),
  subscriptionId: text("subscription_id").references(
    () => memberSubscriptions.id,
    { onDelete: "cascade" }
  ),
  packageId: text("package_id").references(() => memberPackages.id, {
    onDelete: "cascade",
  }),
  chargeDate: timestamp("charge_date", { withTimezone: true })
    .notNull()
    .defaultNow(),
  currency: text("currency").notNull().default("USD"),
  metadata: jsonb("metadata")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  refunded: boolean("refunded").notNull().default(false),
  taxAmount: integer("tax_amount").notNull().default(0),
  created: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
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
