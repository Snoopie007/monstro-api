import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  unique,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { locations } from "../locations";
import {
  botStatusEnum,
  botModelEnum,
} from "./SupportBotEnums";


// Single support bot per location
export const supportBots = pgTable("support_bots", {
  id: text("id").primaryKey().default(sql`uuid_base62()`),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Support Bot"),
  prompt: text("prompt").notNull().default("You are a helpful customer support assistant. You have access to member information tools to help with subscriptions, billing, and bookable sessions. You can also create support tickets and escalate to human agents when needed."),
  temperature: integer("temperature").notNull().default(0),
  initialMessage: text("initial_message").notNull().default("Hi! I'm here to help you. I can assist with your membership status, billing questions, available classes, and any other support needs. What can I help you with today?"),
  model: botModelEnum("model").notNull().default('GPT'),
  status: botStatusEnum("status").notNull().default('Draft'),
  availableTools: jsonb("available_tools").array().notNull().$default(() => DEFAULT_SUPPORT_TOOLS), // Default support tools
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
  unique("support_bots_location_unique").on(t.locationId),
]);

// Define relations
export const supportBotsRelations = relations(supportBots, ({ one }) => ({
  location: one(locations, {
    fields: [supportBots.locationId],
    references: [locations.id],
  }),
}));

