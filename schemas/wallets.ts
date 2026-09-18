import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import type { WalletLedgerType } from "../types/wallet";

export const wallets = pgTable("wallets", {
    id: uuid("id")
        .primaryKey()
        .notNull()
        .default(sql`uuid_base62()`),
    locationId: text("location_id")
        .notNull()
        .references(() => locations.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(0),
    rechargeAmount: integer("recharge_amount").notNull().default(2500),
    rechargeThreshold: integer("recharge_threshold").notNull().default(1000),
    lastCharged: timestamp("last_charged", { withTimezone: true }),
    created: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
});

export const walletLedgers = pgTable("wallet_ledgers", {
    id: uuid("id")
        .primaryKey()
        .notNull()
        .default(sql`uuid_base62()`),
    walletId: text("wallet_id")
        .notNull()
        .references(() => wallets.id, { onDelete: "cascade" }),
    type: text("type").$type<WalletLedgerType>().notNull().default("usage"),
    description: text("description").notNull(),
    amount: integer("amount").notNull().default(0),
    balance: integer("balance").notNull().default(0),
    activityDate: timestamp("activity_date").notNull(),
    created: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    check("wallet_ledgers_type_check", sql`${t.type} IN ('credit', 'reserved', 'usage')`),
]);
