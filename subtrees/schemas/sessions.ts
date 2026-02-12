// GAP(subtrees): sessions table exists in attendance but not in shared subtree schema
// Impact: Better Auth adapter in src/libs/auth/index.ts
// Current direction: keep as local extension until shared schema is updated
// TODO(subtrees-gap): Manual decision needed - decide if sessions should be in shared schema
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations, sql } from "drizzle-orm";

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey().notNull().default(sql`uuid_base62('ses_')`),
  token: text("session_token").notNull(), // Better Auth expects 'token'
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires", { withTimezone: true }).notNull(), // Better Auth expects 'expiresAt'
  ipAddress: text("ip_address"),
  userAgent: text("browser_id"), // Better Auth expects 'userAgent', maps to browser_id column
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
