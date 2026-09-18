import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { locations } from "../locations";
import { members } from "../members";
import { staffs } from "../staffs";
import { rankProcesses } from "./rankProcesses";
import { ranks } from "./ranks";

export const memberRankHistory = pgTable("member_rank_history", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	processId: text("process_id").notNull().references(() => rankProcesses.id, { onDelete: "cascade" }),
	rankId: text("rank_id").notNull().references(() => ranks.id, { onDelete: "cascade" }),
	achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull().defaultNow(),
	promotedBy: text("promoted_by").references(() => staffs.id, { onDelete: "set null" }),
}, (t) => [
	index("member_rank_history_member_process_idx").on(t.memberId, t.locationId, t.processId),
	index("member_rank_history_achieved_at_idx").on(t.achievedAt),
]);
