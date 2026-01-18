import { relations } from "drizzle-orm";
import { text, pgTable, primaryKey, integer } from "drizzle-orm/pg-core";
import { users } from "./users";

export const accounts = pgTable("account", {
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	type: text("type"),
	provider: text("provider").notNull(),
	accountId: text("provider_account_id").notNull(),
	password: text("password"),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	idToken: text("id_token"),
	scope: text("scope"),
	sessionState: text("session_state"),
}, (t) => [primaryKey({ columns: [t.provider, t.accountId] })]);

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}));
