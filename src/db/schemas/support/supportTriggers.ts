import { pgTable, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { triggerTypeEnum } from "./SupportBotEnums";
import { supportAssistants } from "./supportBots";

// Support bot triggers (previously scenarios)
export const supportTriggers = pgTable("support_triggers", {
  id: text("id").primaryKey().default(sql`uuid_base62()`),
  supportAssistantId: text("support_assistant_id").notNull().references(() => supportAssistants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  triggerType: triggerTypeEnum("trigger_type").notNull().default('Keyword'),
  triggerPhrases: text("trigger_phrases").array().notNull().default(sql`ARRAY[]::text[]`),
  toolCall: jsonb("tool_call").notNull(), // Specific tool call to execute
  examples: text("examples").array().notNull().default(sql`ARRAY[]::text[]`),
  requirements: text("requirements").array().notNull().default(sql`ARRAY[]::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
});

// Define relations
export const supportTriggersRelations = relations(supportTriggers, ({ one }) => ({
  assistant: one(supportAssistants, {
    fields: [supportTriggers.supportAssistantId],
    references: [supportAssistants.id],
  }),
}));
