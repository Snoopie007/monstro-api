import { bigint, varchar, bigserial, timestamp, pgTable, integer } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { users } from "./users";
import { roles } from "./permissions";
import { relations } from "drizzle-orm";

export const staffs = pgTable("staffs", {
    id: integer("id").primaryKey(),
    firstName: varchar("first_name", { length: 255 }).notNull(),
    lastName: varchar("last_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 255 }).notNull(),
    avatar: varchar("avatar", { length: 255 }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    roleId: integer("role_id").references(() => roles.id, { onDelete: "set null" }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    created: timestamp("created_at", { withTimezone: false }),
    updated: timestamp("updated_at", { withTimezone: false }),
    deleted: timestamp("deleted_at", { withTimezone: false }),
});

export const staffsRelations = relations(staffs, ({ many, one }) => ({
    location: one(locations, {
        fields: [staffs.locationId],
        references: [locations.id],
    }),
    user: one(users, {
        fields: [staffs.userId],
        references: [users.id],
    }),
    role: one(roles, {
        fields: [staffs.roleId],
        references: [roles.id],
    }),
}));
