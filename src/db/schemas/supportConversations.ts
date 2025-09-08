import { pgTable, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { supportAssistants } from "./supportAssistants";
import { locations } from "./locations";
import { members } from "./members";

// Support conversations for authenticated members only
export const supportConversations = pgTable("support_conversations", {
  id: text("id")
    .primaryKey()
    .default(sql`uuid_base62()`),
  supportAssistantId: text("support_assistant_id")
    .notNull()
    .references(() => supportAssistants.id, { onDelete: "cascade" }),

  // Location and categorization
  locationId: text("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  category: text("category").notNull().default("General"),

  // Member conversation (required)
  memberId: text("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),

  // Vendor takeover functionality
  takenOverAt: timestamp("taken_over_at", { withTimezone: true }),
  isVendorActive: boolean("is_vendor_active").default(false),

  // Conversation title
  title: text("title"),

  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// Define relations
export const supportConversationsRelations = relations(
  supportConversations,
  ({ one, many }) => ({
    supportAssistant: one(supportAssistants, {
      fields: [supportConversations.supportAssistantId],
      references: [supportAssistants.id],
    }),
    location: one(locations, {
      fields: [supportConversations.locationId],
      references: [locations.id],
    }),
    member: one(members, {
      fields: [supportConversations.memberId],
      references: [members.id],
    }),
  })
);

export type SupportConversation = typeof supportConversations.$inferSelect;
export type NewSupportConversation = typeof supportConversations.$inferInsert;
