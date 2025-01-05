import { integer, varchar, serial, text, timestamp, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { roles } from "./roles-and-permissions";

export const staffs = pgTable("staffs", {
    id: serial("id").primaryKey(),
    firstName: varchar("first_name").notNull(),
    lastName: varchar("last_name").notNull(),
    email: varchar("email").notNull(),
    phone: varchar("phone").notNull(),
    avatar: varchar("avatar"),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    roleId: integer("role_id").references(() => roles.id, { onDelete: "set null" }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true }),
});

export const staffsRelations = relations(staffs, ({ many, one }) => ({
    location: one(locations, {
      fields: [staffs.locationId],
      references: [locations.id]
    }),
    user: one(users, {
        fields: [staffs.userId],
        references: [users.id],
    }),
    role: one(roles, {
      fields: [staffs.roleId],
      references: [roles.id]
    })
}));

