import { Contract, MemberContract } from "./contract";
import { FamilyMember } from "./FamilyMember";
import { Transaction } from "./transaction";
import { Location } from "./location";
import { Interval, PlanType, LocationStatus, InvoiceStatus, PackageStatus, PaymentMethod } from "./DatabaseEnums";
import { PlanProgram } from "./program";

export type Member = {
    id?: number;
    firstName: string;
    lastName: string | null;
    email: string;
    referralCode: string;
    currentPoints: number;
    reedemPoints?: number;
    avatar: string | null;
    phone: string | null;
    activityStatus?: string;
    stripeCustomerId?: string;
    familyMembers?: FamilyMember[];
    relatedByFamily?: FamilyMember[];
    memberLocation?: MemberLocation;
    subscriptions?: MemberSubscription[];
    packages?: MemberPackage[];
    referrals?: MemberReferral[];
    referredBy?: MemberReferral;
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};


export type MemberSubscription = {
    id?: number;
    memberId: number;
    parentId?: number | null;
    memberPlanId: number;
    memberContractId?: number | null;
    startDate: Date;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    invoiceId?: string | null;
    cancelAt?: Date | null;
    cancelAtPeriodEnd?: boolean;
    locationId: number;
    stripeSubscriptionId?: string | null;
    trialEnd?: Date | null;
    endedAt?: Date | null;
    paymentMethod: PaymentMethod;
    plan?: MemberPlan;
    member?: Member;
    child?: MemberSubscription | null;
    metadata?: Record<string, unknown>;
    invoices?: MemberInvoice[];
    contract?: MemberContract | null;
    status: LocationStatus;
    created?: Date;
    updated?: Date | null;
};

export type MemberPackage = {
    id?: number;
    memberPlanId: number;
    locationId: number;
    memberId: number;
    parentId?: number | null;
    invoiceId?: string | null;
    memberContractId?: number | null;
    startDate: Date;
    expireDate: Date | null;
    status: PackageStatus;
    paymentMethod: PaymentMethod;
    totalClassAttended?: number;
    totalClassLimit: number;
    metadata?: Record<string, unknown>;
    invoice?: MemberInvoice | null;
    plan?: MemberPlan;
    contract?: MemberContract | null;
    member?: Member;
    parent?: MemberPackage | null;
    transactions?: Transaction[];
    created: Date;
    updated?: Date | null;
};

export type BillingCycleAnchorConfig = {
    day_of_month: number;
    hour?: number;
    minute?: number;
    month?: number;
    second?: number;
}

export type MemberPlan = {
    id?: number;
    name: string;
    description: string;
    archived: boolean;
    family: boolean;
    familyMemberLimit: number;
    contractId?: number | null;
    contract?: Contract | undefined;
    interval: Interval | null;
    intervalThreshold: number | null;
    type: PlanType;
    currency: string;
    price: number;
    totalClassLimit: number | null;
    classLimitInterval: Interval | null;
    classLimitThreshold: number | null;
    stripePriceId: string | null;
    expireInterval: Interval | null;
    expireThreshold: number | null;
    allowProration: boolean;
    billingAnchorConfig: BillingCycleAnchorConfig | null;
    planPrograms?: PlanProgram[];
    created: Date;
    updated: Date | null;
    deleted: Date | null;
    metadata?: Record<string, any>;
    newPlan?: boolean;
};


export type MemberInvoice = {
    id?: number;
    settings?: Record<string, unknown>;
    currency: string | null;
    memberId: number;
    locationId: number;
    description: string | null;
    items: Record<string, unknown>[];
    paid: boolean;
    tax: number;
    total: number;
    discount: number;
    subtotal: number;
    dueDate?: Date;
    forPeriodStart?: Date | null;
    forPeriodEnd?: Date | null;
    attemptCount?: number;
    invoicePdf?: string | null;
    memberPackageId?: number | null;
    memberPackage?: MemberPackage | null;
    memberSubscriptionId?: number | null;
    memberSubscription?: MemberSubscription | null;
    status: InvoiceStatus;
    created?: Date;
    updated?: Date | null;
};

export type MemberLocation = {
    id?: number;
    memberId: number;
    locationId: number;
    status: LocationStatus;
    location?: Location;
    inviteDate: Date | null;
    stripeCustomerId: string | null;
    inviteAcceptedDate: Date | null;
    incompletePlan?: IncompletePlan | null;
    member?: Member;
    created: Date;
    updated: Date | null;
}

export type IncompletePlan = {
    memberPlanId: number | undefined;
    memberContractId: number | undefined;
}

export type FamilyPlan = {
    planName: string;
    planId: number;
    subscriptionId?: number;
    packageId?: number;
}

export type ImportMember = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    lastRenewalDay: Date;
    status: string;
    terms: string;
    termCount: number;
    created: Date;
    updated: Date | null;
    programId: number | null;
    planId: number | null;
    memberId: number | null;
    isFamilyPlan: boolean;
    isPrimaryMember: boolean;
    processed: boolean;
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

export type MemberReferral = {
    memberId: number;
    referredMemberId: number;
    locationId: number;
    created: Date;
    updated: Date | null;
}


