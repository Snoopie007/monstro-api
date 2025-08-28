import { text, timestamp, pgTable, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations, sql } from "drizzle-orm";
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
  email: text("email"),
  avatar: text("avatar"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  created: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
});

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, {
    fields: [vendors.userId],
    references: [users.id],
  }),
  locations: many(locations),
}));
