import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";

export const additionalFeeTypes = ["fixed", "percentage"] as const;

export const additionalFeeCheckoutTypes = [
	"package",
	"subscription",
	"course",
	"event",
	"order",
] as const;

export const additionalFees = pgTable(
	"additional_fees",
	{
		id: text("id")
			.primaryKey()
			.notNull()
			.default(sql`uuid_base62('fee_')`),
		locationId: text("location_id")
			.notNull()
			.references(() => locations.id, { onDelete: "cascade" }),
		label: text("label").notNull(),
		description: text("description"),
		type: text("type", { enum: additionalFeeTypes }).notNull(),
		amount: integer("amount").notNull(),
		checkoutTypes: text("checkout_types", {
			enum: additionalFeeCheckoutTypes,
		})
			.array()
			.notNull(),
		taxable: boolean("taxable").notNull().default(false),
		active: boolean("active").notNull().default(true),
		created: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updated: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("additional_fees_location_active_created_idx").on(
			table.locationId,
			table.active,
			table.created,
		),
		check(
			"additional_fees_label_check",
			sql`char_length(btrim(${table.label})) between 1 and 60`,
		),
		check(
			"additional_fees_type_check",
			sql`${table.type} in ('fixed', 'percentage')`,
		),
		check("additional_fees_amount_check", sql`${table.amount} > 0`),
		check(
			"additional_fees_checkout_types_check",
			sql`cardinality(${table.checkoutTypes}) > 0 and ${table.checkoutTypes} <@ array['package', 'subscription', 'course', 'event', 'order']::text[]`,
		),
	],
);
