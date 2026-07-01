import { sql } from "drizzle-orm";
import {
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { LocationStatusEnum } from "./DatabaseEnums";
import { vendors } from "./vendors";

export const locations = pgTable("locations", {
	id: uuid("id")
		.primaryKey()
		.notNull()
		.default(sql`uuid_base62()`),
	name: text("name").notNull().unique(),
	legalName: text("legal_name"),
	email: text("email"),
	industry: text("industry"),
	address: text("address").unique(),
	city: text("city"),
	state: LocationStatusEnum("state"),
	postalCode: text("postal_code"),
	website: text("website"),
	country: text("country").notNull(),
	phone: text("phone"),
	timezone: text("timezone").notNull().default("America/New_York"),
	logoUrl: text("logo_url"),
	slug: text("slug").unique().notNull(),
	metadata: jsonb("metadata"),
	welcomeMessage: text("welcome_message"),
	about: text("about"),
	vendorId: text("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
	created: timestamp("created_at", { withTimezone: true }).notNull()
		.defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});
