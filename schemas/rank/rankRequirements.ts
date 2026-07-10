import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { ranks } from "./ranks";

export const rankRequirementTypes = ["attendance", "time", "skill"] as const;

export const rankRequirements = pgTable("rank_requirements", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
	rankId: text("rank_id").notNull().references(() => ranks.id, { onDelete: "cascade" }),
	type: text("type").$type<(typeof rankRequirementTypes)[number]>().notNull(),
	name: text("name").notNull(),
	description: text("description"),
	requiredCount: integer("required_count"),
	sortOrder: integer("sort_order").notNull().default(0),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	index("rank_requirements_rank_id_idx").on(t.rankId),
	check(
		"rank_requirements_type_check",
		sql`${t.type} in ('attendance', 'time', 'skill')`,
	),
]);
