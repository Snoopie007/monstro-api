import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { AddonStatus, type AddonType } from "../types/addon";



/** Per-location addon seats (GMB and future products). */
export const locationAddons = pgTable("location_addons", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('')`),
	locationId: text("location_id")
		.notNull()
		.references(() => locations.id, { onDelete: "cascade" }),
	addon: text("addon").$type<AddonType>().notNull(),
	status: text("status")
		.$type<AddonStatus>()
		.notNull()
		.default(AddonStatus.INCOMPLETE),
	stripeSubscriptionId: text("stripe_subscription_id"),
	currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
	canceledAt: timestamp("canceled_at", { withTimezone: true }),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
},
	(t) => [
		index("location_addons_location_addon_idx").on(t.locationId, t.addon),
		index("location_addons_stripe_sub_idx").on(t.stripeSubscriptionId),
		check("location_addon_key", sql`${t.addon} in ('gmb')`),
		check(
			"location_addon_status",
			sql`${t.status} in ('incomplete', 'active', 'past_due', 'canceled')`,
		),
	],
);
