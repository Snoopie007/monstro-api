import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
import { supportBots } from "./supportBots";

// AI persona for support bot (optional)
export const supportBotPersonas = pgTable(
  "support_bot_personas",
  {
    id: text("id")
      .primaryKey()
      .default(sql`uuid_base62()`),
    supportBotId: text("support_bot_id")
      .notNull()
      .references(() => supportBots.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    image: text("image"),
    responseStyle: text("response_style").notNull().default(""),
    personalityTraits: text("personality_traits")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    uniqueSupportBot: unique("support_bot_personas_unique").on(
      table.supportBotId
    ), // One persona per support bot
  })
);

export type SupportBotPersona = typeof supportBotPersonas.$inferSelect;
export type NewSupportBotPersona = typeof supportBotPersonas.$inferInsert;
