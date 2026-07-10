import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { locations } from "../locations";
import { members } from "../members";
import { rankProcesses } from "./rankProcesses";
import { ranks } from "./ranks";

export const memberRanks = pgTable("member_ranks", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62()`),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	processId: text("process_id").notNull().references(() => rankProcesses.id, { onDelete: "cascade" }),
	rankId: text("rank_id").notNull().references(() => ranks.id, { onDelete: "cascade" }),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	uniqueIndex("member_ranks_member_location_process_idx").on(t.memberId, t.locationId, t.processId), 
]);
