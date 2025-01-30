import { integer, varchar, serial, text, timestamp, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations } from "drizzle-orm";

export const roles = pgTable("roles", {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    color: varchar("color"),
    guardName: text("guard_name"),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  guardName: text("guard_name"),
  description: text("description"),
  created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp('updated_at', { withTimezone: true }),
});

export const roleHasPermissions = pgTable("role_has_permissions", {
    roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }),
    permissionId: integer("permission_id").references(() => permissions.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })])

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(roleHasPermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(roleHasPermissions),
}));

export const roleHasPermissionsRelations = relations(roleHasPermissions, ({ one }) => ({
  role: one(roles, {
      fields: [roleHasPermissions.roleId],
      references: [roles.id],
  }),
  permission: one(permissions, {
      fields: [roleHasPermissions.permissionId],
      references: [permissions.id],
  }),
}));

