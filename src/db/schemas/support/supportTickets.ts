import { pgTable, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { supportConversations } from "./supportConversations";
import { users } from "../users";
import { ticketStatusEnum, TicketStatus } from "./SupportBotEnums";

// Support tickets for issue tracking
export const supportTickets = pgTable("support_tickets", {
  id: text("id").primaryKey().default(sql`uuid_base62()`),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => supportConversations.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Support Request"),
  description: text("description"),
  status: ticketStatusEnum("status").notNull().default(TicketStatus.Open),
  priority: integer("priority").default(3), // 1=high, 2=medium, 3=low
  assignedTo: text("assigned_to").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
