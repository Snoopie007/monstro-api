import { text, timestamp, pgTable, uuid, integer, boolean, unique } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { relations } from "drizzle-orm";
import { members } from "./members";
import { vendors } from "./vendors";
import { userRoles } from "./permissions";
import { staffs } from "./staffs";
import { sql } from "drizzle-orm";


export const users = pgTable("users", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	username: text("username").notNull(),
	discriminator: integer("discriminator").notNull(), // 4-digit number as string
	isChild: boolean("is_child").notNull().default(false),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	unique("unique_username_discriminator").on(t.username, t.discriminator),
]);


export const usersRelations = relations(users, ({ many, one }) => ({
	accounts: many(accounts),
	member: one(members, {
		fields: [users.id],
		references: [members.userId],
	}),
	vendor: one(vendors, {
		fields: [users.id],
		references: [vendors.userId],
	}),
	staff: one(staffs, {
		fields: [users.id],
		references: [staffs.userId],
	}),
	roles: many(userRoles),
}));
