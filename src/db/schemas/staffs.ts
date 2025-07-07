import {
  serial,
  text,
  timestamp,
  pgTable,
  integer,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { users } from "./users";
import { roles } from "./permissions";
import { relations, sql } from "drizzle-orm";
import { StaffStatusEnum } from "./DatabaseEnums";

export const staffs = pgTable("staffs", {
  id: uuid("id")
    .primaryKey()
    .notNull()
    .default(sql`uuid_base62()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  avatar: text("avatar"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  created: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
});

export const staffsLocations = pgTable(
  "staff_locations",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .default(sql`uuid_base62()`),
    staffId: text("staff_id")
      .notNull()
      .references(() => staffs.id, { onDelete: "cascade" }),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    status: StaffStatusEnum("status").notNull().default("active"),
  },
  (t) => [primaryKey({ columns: [t.staffId, t.locationId] })]
);

export const staffsLocationRoles = pgTable(
  "staff_location_roles",
  {
    staffLocationId: text("staff_location_id")
      .notNull()
      .references(() => staffsLocations.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.staffLocationId, t.roleId] })]
);

export const staffsRelations = relations(staffs, ({ many, one }) => ({
  staffLocations: many(staffsLocations),
  user: one(users, {
    fields: [staffs.userId],
    references: [users.id],
  }),
}));

export const staffLocationsRelations = relations(
  staffsLocations,
  ({ one, many }) => ({
    staff: one(staffs, {
      fields: [staffsLocations.staffId],
      references: [staffs.id],
    }),
    location: one(locations, {
      fields: [staffsLocations.locationId],
      references: [locations.id],
    }),
    roles: many(staffsLocationRoles),
  })
);

export const staffsLocationRolesRelations = relations(
  staffsLocationRoles,
  ({ one }) => ({
    role: one(roles, {
      fields: [staffsLocationRoles.roleId],
      references: [roles.id],
    }),
    staffLocation: one(staffsLocations, {
      fields: [staffsLocationRoles.staffLocationId],
      references: [staffsLocations.id],
    }),
  })
);
