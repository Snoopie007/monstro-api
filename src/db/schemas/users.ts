import { serial, text, timestamp, pgTable } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";
import { relations } from "drizzle-orm";
import { members } from "./members";
import { vendors } from "./vendors";
import { userRoles } from "./permissions";
import { staffs } from "./staffs";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("email_verified_at", { withTimezone: true }),
    image: text("image"),
    password: text("password"),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
    deleted: timestamp("deleted_at", { withTimezone: true }),
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
