import { serial, text, timestamp, pgTable } from "drizzle-orm/pg-core";
import { AdminUserRoleEnum, supportCases, supportCaseMessages } from ".";
import { relations } from "drizzle-orm";

export const adminUsers = pgTable("admin_users", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    role: AdminUserRoleEnum("role").default('Staff'),
    image: text("image"),
    password: text('password'),
    phone: text('phone'),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});


export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
    supportCases: many(supportCases),
    supportCaseMessages: many(supportCaseMessages)
}));

