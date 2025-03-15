import { text, timestamp, pgTable, primaryKey, unique, integer, serial } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { RoleColorEnum } from "./enums";

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  guardName: text("guard_name").notNull(),
  locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
  color: RoleColorEnum("color"),
  created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp('updated_at', { withTimezone: true }),
}, (t) => [
  unique().on(t.name, t.guardName),
]);

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  guardName: text("guard_name").notNull(),
  description: text("description"),
  created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp('updated_at', { withTimezone: true }),
}, (t) => [
  unique().on(t.name, t.guardName),
]);

export const roleHasPermissions = pgTable("role_has_permissions", {
  roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").references(() => permissions.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })]);


export const userRoles = pgTable("user_roles", {
  roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.roleId, t.userId] }),
  unique().on(t.userId, t.roleId),
]);

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(roleHasPermissions),
  userRoles: many(userRoles),
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

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
}));
