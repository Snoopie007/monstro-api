import { pgTable } from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";
import { integer, jsonb, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { MemberLocationProfile } from "../types/member";
import { LocationStatusEnum } from "./DatabaseEnums";
import { locations } from "./locations";
import { members } from "./members";

export const memberLocations = pgTable("member_locations", {
    memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    status: LocationStatusEnum("status").notNull().default("incomplete"),
    points: integer("points").notNull().default(0),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: false }),
    waiverId: text("waiver_id").references(() => locations.id, {
        onDelete: "set null",
    }),
    // MEMBER INFO UPDATE START: Added member personal information fields
    profile: jsonb("profile").$type<MemberLocationProfile>(),
    // MEMBER INFO UPDATE END
    botMetadata: jsonb("bot_metadata").default(sql`'{}'::jsonb`),
    lastBotInteraction: timestamp("last_bot_interaction", { withTimezone: true }),

},
    (t) => [primaryKey({ columns: [t.memberId, t.locationId] })]
);