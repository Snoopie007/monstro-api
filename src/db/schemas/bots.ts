import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  unique,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

import { locations } from "./locations";
import { botStatus, botModel } from "./BotEnums";
import { workflows } from "./workflows";

export const bots = pgTable("bots", {
  id: text("id")
    .primaryKey()
    .default(sql`uuid_base62()`),
  name: text("name"),
  prompt: text("prompt").notNull().default(""),
  locationId: text("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  temperature: integer("temperature").notNull().default(0),
  initialMessage: text("initial_message"),
  model: botModel("model").notNull().default("gpt"),
  objectives: jsonb("objectives")
    .array()
    .notNull()
    .default(sql`ARRAY[]::jsonb[]`),
  invalidNodes: text("invalid_nodes")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  status: botStatus("status").notNull().default("Draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const aiPersona = pgTable("ai_persona", {
  id: text("id")
    .primaryKey()
    .default(sql`uuid_base62()`),
  locationId: text("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  image: text("image"),
  responseDetails: text("response_details").notNull().default(""),
  personality: text("personality")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const botPersonas = pgTable(
  "bot_personas",
  {
    botId: text("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    personaId: text("persona_id")
      .notNull()
      .references(() => aiPersona.id, { onDelete: "cascade" }),
  },
  (table) => ({
    uniqueBotPersona: unique("bot_personas_unique").on(
      table.botId,
      table.personaId
    ),
  })
);

export const botScenarios = pgTable(
  "bot_scenarios",
  {
    id: text("id")
      .primaryKey()
      .default(sql`uuid_base62()`),
    name: text("name").notNull(),
    botId: text("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id").references(() => workflows.id, {
      onDelete: "set null",
    }),
    routineId: text("routine_id").references(() => bots.id, {
      onDelete: "set null",
    }),
    trigger: text("trigger").notNull(),
    examples: text("examples")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    requirements: text("requirements")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    yield: boolean("yield").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    uniqueBotRoutine: unique("bot_scenarios_bot_routine_unique").on(
      table.botId,
      table.routineId
    ),
  })
);

export const botTemplates = pgTable("bot_templates", {
  id: text("id")
    .primaryKey()
    .default(sql`uuid_base62()`),
  name: text("name").notNull(),
  description: text("description"),
  prompt: text("prompt").notNull().default(""),
  responseDetails: text("response_details").notNull().default(""),
  model: text("model").notNull(),
  initialMessage: text("initial_message"),
  invalidNodes: text("invalid_nodes")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  objectives: jsonb("objectives")
    .array()
    .notNull()
    .default(sql`ARRAY[]::jsonb[]`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});
