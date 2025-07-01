import { Contract, MemberContract } from "./contract";
import { FamilyMember } from "./FamilyMember";
import { Transaction } from "./transaction";
import { Location } from "./location";
import { LocationStatus, InvoiceStatus } from "./DatabaseEnums";
import { PlanProgram } from "./program";
import { importMembers, memberInvoices, memberLocations, memberPackages, memberPlans, memberReferrals, members, memberSubscriptions } from "@/db/schemas";

export type Member = typeof members.$inferInsert & {
    familyMembers?: FamilyMember[];
    relatedByFamily?: FamilyMember[];
    memberLocation?: MemberLocation;
    subscriptions?: MemberSubscription[];
    packages?: MemberPackage[];
    referrals?: MemberReferral[];
    referredBy?: MemberReferral;
};


export type MemberSubscription = typeof memberSubscriptions.$inferInsert & {
    child?: MemberSubscription | null;
    invoices?: MemberInvoice[];
    contract?: MemberContract | null;
    member?: Member;
};

export type MemberPackage = typeof memberPackages.$inferInsert & {

    invoice?: MemberInvoice | null;
    plan?: MemberPlan;
    contract?: MemberContract | null;
    member?: Member;
    parent?: MemberPackage | null;
    transactions?: Transaction[];
};

export type BillingCycleAnchorConfig = {
    day_of_month: number;
    hour?: number;
    minute?: number;
    month?: number;
    second?: number;
}

export type MemberPlan = typeof memberPlans.$inferInsert & {
    contract?: Contract | undefined;
    billingAnchorConfig: BillingCycleAnchorConfig | null;
    planPrograms?: PlanProgram[];
    member?: Member;
};


export type MemberInvoice = typeof memberInvoices.$inferInsert & {
    member?: Member;
    location?: Location;
    memberPackage?: MemberPackage | null;
    memberSubscription?: MemberSubscription | null;
};

export type MemberLocation = typeof memberLocations.$inferInsert & {
    location?: Location;
    member?: Member;
}



export type FamilyPlan = {
    planName: string;
    planId: number;
    subscriptionId?: number;
    packageId?: number;
}

export type ImportMember = typeof importMembers.$inferInsert & {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    lastRenewalDay: Date;
    status: string;
    created: Date;
    updated: Date | null;
    planId: number | null;
    memberId: number | null;
    isPrimaryMember: boolean;
    locationId: number;
}

export type MemberPointsHistory = {
    id: number;
    memberId: number;
    locationId: number;
    points: number;
    type: string;
    removed: boolean;
    removedReason: string | null;
    removedOn: Date | null;
    created: Date;
    updated: Date | null;
}

export type MemberReferral = typeof memberReferrals.$inferInsert & {
    member?: Member;
    referred?: Member;
    location?: Location;
}


