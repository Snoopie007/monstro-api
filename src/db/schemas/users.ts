import { text, timestamp, pgTable, uuid, integer } from "drizzle-orm/pg-core";
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
	image: text("image"),
	username: text("username"),
	discriminator: integer("discriminator"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

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
