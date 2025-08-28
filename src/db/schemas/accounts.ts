import { relations } from "drizzle-orm";
import { text, pgTable, primaryKey, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import type { AdapterAccountType } from "next-auth/adapters";

export const accounts = pgTable("account", {
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<AdapterAccountType>(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  id_token: text("id_token"),
  scope: text("scope"),
  session_state: text("session_state"),
},
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));
