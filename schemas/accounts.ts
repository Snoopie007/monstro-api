import { sql } from "drizzle-orm";
import { text, pgTable, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const accounts = pgTable("account", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	type: text("type"),
	provider: text("provider").notNull(),
	accountId: text("provider_account_id").notNull().unique(),
	password: text("password"),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expires: timestamp("expires_at", { withTimezone: true }),
	tokenType: text("token_type"),
	idToken: text("id_token"),
	scope: text("scope"),
	sessionState: text("session_state"),
	created: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.provider, t.accountId] })]);
