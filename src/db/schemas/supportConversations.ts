import { pgTable, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
import { supportBots } from "./supportBots";
import { members } from "./members";
import { users } from "./users";

// Support conversations for authenticated members only
export const supportConversations = pgTable("support_conversations", {
  id: text("id")
    .primaryKey()
    .default(sql`uuid_base62()`),
  supportBotId: text("support_bot_id")
    .notNull()
    .references(() => supportBots.id, { onDelete: "cascade" }),

  // Member conversation (required)
  memberId: text("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),

  // Vendor takeover functionality
  vendorId: text("vendor_id").references(() => users.id, {
    onDelete: "set null",
  }),
  takenOverAt: timestamp("taken_over_at", { withTimezone: true }),
  isVendorActive: boolean("is_vendor_active").default(false),

  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export type SupportConversation = typeof supportConversations.$inferSelect;
export type NewSupportConversation = typeof supportConversations.$inferInsert;
