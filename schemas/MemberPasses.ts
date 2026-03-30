import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { memberPlans } from "./MemberPlans";
import { members } from "./members";

export const memberPasses = pgTable("member_passes", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    referrerId: text("referrer_id").references(() => members.id, { onDelete: "cascade" }),
    planId: text("plan_id").notNull().references(() => memberPlans.id, { onDelete: "cascade" }),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    claimedBy: text("claimed_by").references(() => members.id, { onDelete: "set null", }),
    claimedOn: timestamp("claimed_on", { withTimezone: true }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

