import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
import { locations } from "./locations";
import {
  botStatusEnum,
  botModelEnum,
  BotModel,
  BotStatus,
} from "./SupportBotEnums";

// Single support bot per location
export const supportBots = pgTable(
  "support_bots",
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
      .default("You are a helpful customer support assistant."),
    temperature: integer("temperature").notNull().default(0),
    initialMessage: text("initial_message")
      .notNull()
      .default("Hi! I'm here to help you. What can I assist you with today?"),
    model: botModelEnum("model").notNull().default(BotModel.GPT),
    status: botStatusEnum("status").notNull().default(BotStatus.Draft),
    availableTools: jsonb("available_tools")
      .array()
      .notNull()
      .default(sql`ARRAY[]::jsonb[]`), // Fixed set of tool definitions
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    uniqueLocation: unique("support_bots_location_unique").on(table.locationId), // Only one support bot per location
  })
);

export type SupportBot = typeof supportBots.$inferSelect;
export type NewSupportBot = typeof supportBots.$inferInsert;
