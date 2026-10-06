import type { ToolPayload } from "../../types/bots";
import { sql } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { bots } from "./bots";

export const messageRoleEnum = pgEnum("message_role", [
	"human",
	"ai",
	"staff",
	"system",
	"tool",
	"tool_message",
	"tool_call",
]);



export const botMessages = pgTable("bot_messages", {
	id: text("id").primaryKey().default(sql`uuid_base62('bmsg_')`),
	botId: text("bot_id")
		.notNull()
		.references(() => bots.id, { onDelete: "cascade" }),
	role: messageRoleEnum("role").notNull(),
	content: text("content").notNull().default(""),
	/** Tool payload when role is `tool`. Null for human and AI text. */
	jsonContent: jsonb("json_content").$type<ToolPayload>(),
	metadata: jsonb("metadata")
		.$type<Record<string, unknown>>()
		.notNull()
		.default(sql`'{}'::jsonb`),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
},
	(t) => [
		index("bot_messages_bot_created_idx").on(t.botId, t.created),
	],
);
