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
  BotModel,
  BotStatus,
} from "./SupportBotEnums";

export interface SupportTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  category?: string;
}

// Default tool definitions for support bots
export const DEFAULT_SUPPORT_TOOLS: SupportTool[] = [
  {
    name: "get_member_status",
    description: "Get member subscription and package status information including active subscriptions, available packages, and membership details",
    category: "member_info",
    parameters: {
      type: "object",
      properties: {
        memberId: {
          type: "string",
          description: "The member ID to look up (automatically provided from session)",
        },
      },
      required: ["memberId"],
    },
  },
  {
    name: "get_member_billing",
    description: "Get member billing and payment information including payment methods, transaction history, and upcoming payments",
    category: "member_info",
    parameters: {
      type: "object",
      properties: {
        memberId: {
          type: "string",
          description: "The member ID to look up (automatically provided from session)",
        },
      },
      required: ["memberId"],
    },
  },
  {
    name: "get_member_bookable_sessions",
    description: "Get classes and sessions the member can book based on their active subscriptions and available packages",
    category: "member_info",
    parameters: {
      type: "object",
      properties: {
        memberId: {
          type: "string",
          description: "The member ID to look up (automatically provided from session)",
        },
      },
      required: ["memberId"],
    },
  },
  {
    name: "create_support_ticket",
    description: "Create a support ticket for tracking customer issues and requests",
    category: "support",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Brief title for the support ticket",
        },
        description: {
          type: "string",
          description: "Detailed description of the issue",
        },
        priority: {
          type: "number",
          minimum: 1,
          maximum: 3,
          description: "Priority level: 1=high, 2=medium, 3=low",
        },
      },
      required: ["title", "description"],
    },
  },
  {
    name: "search_knowledge_base",
    description: "Search the knowledge base for general facility information, policies, and frequently asked questions",
    category: "knowledge",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for the knowledge base",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "escalate_to_human",
    description: "Escalate the conversation to a human agent when the bot cannot help or when complex issues require human intervention",
    category: "support",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Reason for escalation",
        },
        urgency: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Urgency level of the escalation",
        },
      },
      required: ["reason", "urgency"],
    },
  },
];

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
      .$default(() => DEFAULT_SUPPORT_TOOLS), // Default support tools
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    uniqueLocation: unique("support_bots_location_unique").on(table.locationId), // Only one support bot per location
  })
);

// Define relations
export const supportBotsRelations = relations(supportBots, ({ one }) => ({
  location: one(locations, {
    fields: [supportBots.locationId],
    references: [locations.id],
  }),
}));

export type SupportBot = typeof supportBots.$inferSelect;
export type NewSupportBot = typeof supportBots.$inferInsert;
