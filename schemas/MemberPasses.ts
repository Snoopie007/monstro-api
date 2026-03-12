import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { members } from "./members";
import { locations } from "./locations";

export const memberPasses = pgTable("member_passes", {
    id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
    memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    claimedBy: text("claimed_by").references(() => members.id, {
        onDelete: "set null",
    }),
    claimedOn: timestamp("claimed_on", { withTimezone: true }),
});

