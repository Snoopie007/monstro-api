import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { EventTicketPricingMethodEnum } from "../DatabaseEnums";
import type { EventTicketStatus } from "../../types/DatabaseEnums";
import { locationEvents } from "./LocationEvents";

export const eventTickets = pgTable("event_tickets", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('tkt_')`),
	eventId: text("event_id").notNull().references(() => locationEvents.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	pricingMethod: EventTicketPricingMethodEnum("pricing_method").notNull().default("free"),
	price: integer("price").notNull().default(0),
	quantity: integer("quantity"),
	saleStartsAt: timestamp("sale_starts_at", { withTimezone: true }),
	saleEndsAt: timestamp("sale_ends_at", { withTimezone: true }),
	status: text("status").$type<EventTicketStatus>().notNull().default("active"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	index("event_tickets_event_status_idx").on(t.eventId, t.status),
	check(
		"event_tickets_status_check",
		sql`${t.status} in ('active', 'closed')`,
	),
]);
