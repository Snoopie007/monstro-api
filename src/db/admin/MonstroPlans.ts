import type { MonstroPlansBenefits } from "@/types/admin";
import { relations } from "drizzle-orm";
import { integer, serial, text, timestamp, pgTable, jsonb } from "drizzle-orm/pg-core";


export const monstroPackages = pgTable('monstro_packages', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    price: integer('price').notNull(),
    benefits: jsonb('benefits').$type<MonstroPlansBenefits[]>().notNull().default([]),
    created: timestamp('created_at').notNull().defaultNow(),
    updated: timestamp('updated_at'),
});

export const monstroPackagePaymentPlans = pgTable('monstro_package_payment_plans', {
    id: serial('id').primaryKey(),
    packageId: integer('package_id').notNull().references(() => monstroPackages.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull(),
    downPayment: integer('down_payment').notNull(),
    monthlyPayment: integer('monthly_payment').notNull(),
    length: integer('length').notNull(),
    interval: text('interval').notNull(),
    discount: integer('discount').notNull(),
    trial: integer('trial').notNull(),
    priceId: text('price_id'),
    testPriceId: text('test_price_id'),
    created: timestamp('created_at').notNull().defaultNow(),
    updated: timestamp('updated_at'),
});

export const monstroPlans = pgTable('monstro_plans', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    price: integer('price').notNull(),
    usagePercent: integer('usage_percent').notNull(),
    threshold: integer('threshold').notNull(),
    interval: text('interval').notNull(),
    benefits: jsonb('benefits').$type<MonstroPlansBenefits[]>().notNull().default([]),
    description: text('description').notNull(),
    priceId: text('price_id'),
    testPriceId: text('test_price_id'),
    aiBots: integer('ai_bots').notNull(),
    note: text('note'),
    coupon: text('coupon'),
    created: timestamp('created_at').notNull().defaultNow(),
    updated: timestamp('updated_at'),
});

export const monstroPackagesRelations = relations(monstroPackages, ({ many }) => ({
    paymentPlans: many(monstroPackagePaymentPlans),
}));

export const monstroPackagePaymentPlansRelations = relations(monstroPackagePaymentPlans, ({ one }) => ({
    package: one(monstroPackages, {
        fields: [monstroPackagePaymentPlans.packageId],
        references: [monstroPackages.id],
    }),
}));
