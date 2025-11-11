import { relations } from "drizzle-orm";
import { locations, locationState, wallets, memberLocations, walletUsages } from "./locations";
import {
    members,
    memberInvoices,
    memberPointsHistory,
    memberReferrals
} from "./members";
import { attendances } from "./attendances";
import { integrations } from "./integrations";
import { programs } from "./programs";
import { memberPlans, memberSubscriptions } from "./MemberPlans";
import { vendors } from "./vendors";
import { transactions } from "./transactions";
import { taxRates } from "./tax";

export const locationsRelations = relations(locations, ({ many, one }) => ({
    memberLocations: many(memberLocations),
    integrations: many(integrations),
    programs: many(programs),
    memberPlans: many(memberPlans),
    memberSubscriptions: many(memberSubscriptions),
    memberInvoices: many(memberInvoices),
    pointsHistory: many(memberPointsHistory),
    referrals: many(memberReferrals),
    locationState: one(locationState, {
        fields: [locations.id],
        references: [locationState.locationId],
    }),
    vendor: one(vendors, {
        fields: [locations.vendorId],
        references: [vendors.id],
    }),
    wallet: one(wallets, {
        fields: [locations.id],
        references: [wallets.locationId],
    }),
    taxRate: one(taxRates, {
        fields: [locations.id],
        references: [taxRates.locationId],
    }),
}));

export const locationStateRelations = relations(locationState, ({ one }) => ({
    location: one(locations, {
        fields: [locationState.locationId],
        references: [locations.id],
    }),
}));

export const memberLocationsRelations = relations(
    memberLocations,
    ({ one, many }) => ({
        member: one(members, {
            fields: [memberLocations.memberId],
            references: [members.id],
        }),
        location: one(locations, {
            fields: [memberLocations.locationId],
            references: [locations.id],
        }),
        transactions: many(transactions),
        attendances: many(attendances),
    })
);

export const walletRelations = relations(wallets, ({ one, many }) => ({
    location: one(locations, {
        fields: [wallets.locationId],
        references: [locations.id],
    }),
    usages: many(walletUsages, { relationName: "usages" }),
}));