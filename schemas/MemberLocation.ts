import { pgTable } from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import type { MemberLocationProfile } from "../types/member";
import { LocationStatusEnum } from "./DatabaseEnums";
import { locations } from "./locations";
import { memberContracts, members } from "./members";

export const memberLocations = pgTable("member_locations", {
    memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    status: LocationStatusEnum("status").notNull().default("incomplete"),
    points: integer("points").notNull().default(0),
    gatewayCustomerId: text("gateway_customer_id").unique(),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: false }),
    signedWaiverId: text("signed_waiver_id").references(() => memberContracts.id, {
        onDelete: "set null",
    }),
    onboarded: boolean("onboarded").notNull().default(false),
    profile: jsonb("profile").$type<MemberLocationProfile>(),
    botMetadata: jsonb("bot_metadata").default(sql`'{}'::jsonb`),
    lastBotInteraction: timestamp("last_bot_interaction", { withTimezone: true }),

},
    (t) => [primaryKey({ columns: [t.memberId, t.locationId] })]
);