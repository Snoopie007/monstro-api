import { index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { locations } from "../locations";
import { members } from "../members";
import { staffs } from "../staffs";
import { rankRequirements } from "./rankRequirements";

export const memberRankRequirements = pgTable("member_rank_requirements", {
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	requirementId: text("requirement_id").notNull().references(() => rankRequirements.id, { onDelete: "cascade" }),
	achievedAt: timestamp("achieved_at", { withTimezone: true }),
	verifiedBy: text("verified_by").references(() => staffs.id, { onDelete: "set null" }),
	progress: integer("progress"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	primaryKey({ columns: [t.memberId, t.locationId, t.requirementId] }),
	index("member_rank_requirements_location_member_idx").on(t.locationId, t.memberId),
]);
