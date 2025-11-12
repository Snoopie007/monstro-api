import { relations } from "drizzle-orm";
import { text, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";

export const accounts = pgTable("account", {
  // Better Auth expected fields (camelCase in code, snake_case in DB)
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type"),
  provider: text("provider").notNull(),
  accountId: text("provider_account_id").notNull(), // Better Auth expects 'accountId'
  password: text("password"), // ← Add this
  refreshToken: text("refresh_token"), // Better Auth expects 'refreshToken'
  accessToken: text("access_token"), // Better Auth expects 'accessToken'
  expiresAt: text("expires_at"), // Better Auth expects 'expiresAt'
  tokenType: text("token_type"), // Better Auth expects 'tokenType'
  idToken: text("id_token"), // Better Auth expects 'idToken'
  scope: text("scope"),
  sessionState: text("session_state"), // Better Auth expects 'sessionState'
}, (t) => [primaryKey({ columns: [t.provider, t.accountId] })]);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),

}));
