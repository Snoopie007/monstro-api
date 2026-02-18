import { pgTable, text, timestamp, integer, uuid, boolean } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { sql } from "drizzle-orm";

export const wallets = pgTable("wallets", {
    id: uuid("id")
        .primaryKey()
        .notNull()
        .default(sql`uuid_base62()`),
    locationId: text("location_id")
        .notNull()
        .references(() => locations.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(0),
    credits: integer("credits").notNull().default(0),
    rechargeAmount: integer("recharge_amount").notNull().default(2500),
    rechargeThreshold: integer("recharge_threshold").notNull().default(1000),
    lastCharged: timestamp("last_charged", { withTimezone: true }),
    created: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});

export const walletUsages = pgTable("wallet_usages", {
    id: uuid("id")
        .primaryKey()
        .notNull()
        .default(sql`uuid_base62()`),
    walletId: text("wallet_id")
        .notNull()
        .references(() => wallets.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amount: integer("amount").notNull().default(0),
    balance: integer("balance").notNull().default(0),
    isCredit: boolean("is_credit").notNull().default(false),
    activityDate: timestamp("activity_date").notNull(),
    created: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});

