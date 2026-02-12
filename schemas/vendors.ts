import {
  text,
  timestamp,
  pgTable,
  integer,
  serial,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations, sql } from "drizzle-orm";
import { vendorLevels } from "./VendorProgress";
import { vendorReferrals } from "./VendorReferrals";
import { locations } from "./locations";

export const vendors = pgTable("vendors", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`uuid_base62()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  stripeCustomerId: text("stripe_customer_id"),
  phone: text("phone"),
  email: text("email").notNull().unique(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  created: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
});

export const supportPlans = pgTable("support_plans", {
  id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
  vendorId: text("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  supportCalls: boolean("support_calls").notNull().default(false),
  sessionsPerMonth: integer("sessions_per_month").notNull().default(0),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
});

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, {
    fields: [vendors.userId],
    references: [users.id],
  }),
  locations: many(locations),
  vendorLevel: one(vendorLevels, {
    fields: [vendors.id],
    references: [vendorLevels.vendorId],
  }),
  referrals: many(vendorReferrals, { relationName: "referrals" }),
  referee: one(vendorReferrals, {
    fields: [vendors.id],
    references: [vendorReferrals.referralId],
    relationName: "referee",
  }),
  supportPlans: one(supportPlans, {
    fields: [vendors.id],
    references: [supportPlans.vendorId],
  }),
}));

export const supportPlansRelations = relations(supportPlans, ({ one }) => ({
  vendor: one(vendors, {
    fields: [supportPlans.vendorId],
    references: [vendors.id],
  }),
}));
