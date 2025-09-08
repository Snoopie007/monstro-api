import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  unique,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { locations } from "./locations";
import {
  botStatusEnum,
  botModelEnum,
  BotModel,
  BotStatus,
} from "./SupportBotEnums";
import { getDefaultSupportTools } from "@/libs/supportBotDefaults";
import { supportTriggers } from "./supportTriggers";

// Single support assistant per location
export const supportAssistants = pgTable(
  "support_assistants",
  {
    id: text("id")
      .primaryKey()
      .default(sql`uuid_base62()`),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Support Bot"),
    prompt: text("prompt")
      .notNull()
      .default(
        "You are a helpful customer support assistant. You have access to member information tools to help with subscriptions, billing, and bookable sessions. You can also create support tickets and escalate to human agents when needed."
      ),
    temperature: integer("temperature").notNull().default(0),
    initialMessage: text("initial_message")
      .notNull()
      .default(
        "Hi! I'm here to help you. I can assist with your membership status, billing questions, available classes, and any other support needs. What can I help you with today?"
      ),
    model: botModelEnum("model").notNull().default(BotModel.GPT),
    status: botStatusEnum("status").notNull().default(BotStatus.Draft),
    availableTools: jsonb("available_tools")
      .array()
      .notNull()
      .$default(() => getDefaultSupportTools()), // Default support tools
    persona: jsonb("persona").notNull().default(sql`'{}'::jsonb`), // Persona data as JSONB
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    uniqueLocation: unique("support_bots_location_unique").on(table.locationId), // Only one support assistant per location
  })
);

// Define relations
export const supportAssistantsRelations = relations(supportAssistants, ({ one, many }) => ({
  location: one(locations, {
    fields: [supportAssistants.locationId],
    references: [locations.id],
  }),
  triggers: many(supportTriggers),
}));

export type SupportAssistant = typeof supportAssistants.$inferSelect;
export type NewSupportAssistant = typeof supportAssistants.$inferInsert;
