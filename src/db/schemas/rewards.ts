import { bigint, varchar, bigserial, text, integer, timestamp, pgTable ,serial} from "drizzle-orm/pg-core";
import { locations } from "./locations";

export const rewards = pgTable("rewards", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    icon: varchar("icon", { length: 255 }),
    requiredPoints: integer("required_points").notNull(),
    limitPerMember: integer("limit_per_member").notNull(),
    totalLimit: varchar("limit_total", { length: 255 }).notNull().default("unlimited"),
    images: text("images").array().notNull(), // No default array (set in app logic)
    created: timestamp("created_at", { withTimezone: false }),
    updated: timestamp("updated_at", { withTimezone: false }),
});
