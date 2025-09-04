import { pgTable, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { supportBots } from "./supportBots";
import { triggerTypeEnum, TriggerType } from "./SupportBotEnums";

// Support bot triggers (previously scenarios)
export const supportTriggers = pgTable("support_triggers", {
  id: text("id")
    .primaryKey()
    .default(sql`uuid_base62()`),
  supportBotId: text("support_bot_id")
    .notNull()
    .references(() => supportBots.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  triggerType: triggerTypeEnum("trigger_type")
    .notNull()
    .default(TriggerType.Keyword),
  triggerPhrases: text("trigger_phrases")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  toolCall: jsonb("tool_call").notNull(), // Specific tool call to execute
  examples: text("examples")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  requirements: text("requirements")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// Define relations
export const supportTriggersRelations = relations(
  supportTriggers,
  ({ one }) => ({
    supportBot: one(supportBots, {
      fields: [supportTriggers.supportBotId],
      references: [supportBots.id],
    }),
  })
);

export type SupportTrigger = typeof supportTriggers.$inferSelect;
export type NewSupportTrigger = typeof supportTriggers.$inferInsert;
