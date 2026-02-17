import { text, timestamp, pgTable, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { sql } from "drizzle-orm";

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
