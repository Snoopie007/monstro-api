import { index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { locations } from "../locations";
import { members } from "../members";
import { rankProcesses } from "./rankProcesses";
import { ranks } from "./ranks";

export const memberRanks = pgTable("member_ranks", {
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	processId: text("process_id").notNull().references(() => rankProcesses.id, { onDelete: "cascade" }),
	rankId: text("rank_id").notNull().references(() => ranks.id, { onDelete: "cascade" }),
	achievedAt: timestamp("achieved_at", { withTimezone: true }),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	primaryKey({ columns: [t.memberId, t.locationId, t.processId] }),
	index("member_ranks_location_member_idx").on(t.locationId, t.memberId),
]);
