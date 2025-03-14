import { bigserial, varchar, bigint, text, timestamp, pgTable, primaryKey, unique, integer, serial } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { RoleColorEnum } from "./Enums";

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  guardName: varchar("guard_name", { length: 255 }).notNull(),
  locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
  color: RoleColorEnum("color"),
  created: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updated: timestamp('updated_at', { withTimezone: false }),
}, (t) => [
  unique().on(t.name, t.guardName),
]);

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  guardName: varchar("guard_name", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }),
  created: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updated: timestamp('updated_at', { withTimezone: false }).defaultNow(),
}, (t) => [
  unique().on(t.name, t.guardName),
]);

export const roleHasPermissions = pgTable("role_has_permissions", {
  roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").references(() => permissions.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })]);


export const modelHasRoles = pgTable("model_has_roles", {
  roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }),
  modelId: integer("model_id").references(() => users.id, { onDelete: "cascade" }),
  modelType: varchar("model_type", { length: 255 }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.roleId, t.modelId, t.modelType] }),
  unique().on(t.modelId, t.modelType),
]);

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(roleHasPermissions),
  modelHasRoles: many(modelHasRoles),
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

export const modelHasRolesRelations = relations(modelHasRoles, ({ one }) => ({
  role: one(roles, {
    fields: [modelHasRoles.roleId],
    references: [roles.id],
  }),
  user: one(users, {
    fields: [modelHasRoles.modelId],
    references: [users.id],
  }),
}));
