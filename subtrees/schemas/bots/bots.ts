import { sql } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import { locations } from "../locations";
import { users } from "../users";

export const bots = pgTable("bots", {
	id: text("id").primaryKey().default(sql`uuid_base62('bot_')`),
	locationId: text("location_id")
		.notNull()
		.references(() => locations.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	role: text("role", { enum: ["vendor", "staff"] }).notNull(),
	purpose: text("purpose").notNull().default("member_ops"),
	name: text("name").notNull().default("Member Ops"),
	memories: text("memories").array().notNull().default(sql`'{}'`),
	metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
},
	(t) => [
		unique("bots_location_user_purpose_uq").on(t.locationId, t.userId, t.purpose),
		index("bots_location_user_idx").on(t.locationId, t.userId),
	],
);
