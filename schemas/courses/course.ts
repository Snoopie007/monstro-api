import { sql, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { locations } from "../locations";

export type CourseStatus = "draft" | "published" | "archived";

export const courses = pgTable("courses", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('crs_')`),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	slug: text("slug").notNull(),
	title: text("title").notNull(),
	description: text("description"),
	coverImage: text("cover_image"),
	status: text("status").$type<CourseStatus>().notNull().default("draft"),
	paid: boolean("paid").notNull().default(false),
	price: integer("price").notNull().default(0),
	metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	unique("courses_location_slug_unique").on(t.locationId, t.slug),
	index("courses_location_status_created_idx").on(t.locationId, t.status, t.created.desc()),
	check("courses_status_check", sql`${t.status} in ('draft', 'published', 'archived')`),
	check("courses_price_nonnegative", sql`${t.price} >= 0`),
]);

export type Course = InferSelectModel<typeof courses>;
export type NewCourse = InferInsertModel<typeof courses>;
