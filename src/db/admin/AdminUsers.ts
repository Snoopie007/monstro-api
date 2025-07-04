import { serial, text, timestamp, pgTable } from "drizzle-orm/pg-core";
import { AdminUserRoleEnum } from "./AdminEnums";

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: AdminUserRoleEnum("role").default("Staff"),
  image: text("image"),
  password: text("password"),
  phone: text("phone"),
  created: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
});
