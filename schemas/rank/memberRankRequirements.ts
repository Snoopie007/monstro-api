import { index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { staffs } from "../staffs";
import { rankRequirements } from "./rankRequirements";
import { locations } from "../locations";
import { members } from "../members";

export const memberRankRequirements = pgTable("member_rank_requirements", {
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	requirementId: text("requirement_id").notNull().references(() => rankRequirements.id, { onDelete: "cascade" }),
	achievedAt: timestamp("achieved_at", { withTimezone: true }),
	verifiedBy: text("verified_by").references(() => staffs.id, { onDelete: "set null" }),
	progress: integer("progress").notNull().default(0),
}, (t) => [
	primaryKey({ columns: [t.memberId, t.locationId, t.requirementId] }),
	index("member_rank_requirements_member_location_requirement_idx").on(t.memberId, t.locationId, t.requirementId),
]);
