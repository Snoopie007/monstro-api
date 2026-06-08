import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { RankRequirementTypeEnum } from "../DatabaseEnums";
import { ranks } from "./ranks";

export const rankRequirements = pgTable("rank_requirements", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	rankId: text("rank_id").notNull().references(() => ranks.id, { onDelete: "cascade" }),
	type: RankRequirementTypeEnum("type").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	requiredCount: integer("required_count"),
	sortOrder: integer("sort_order").notNull().default(0),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	index("rank_requirements_rank_id_idx").on(t.rankId),
]);
