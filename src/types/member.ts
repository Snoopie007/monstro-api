import { Achievement } from "./achievement";
import { Contract } from "./contract";
import { FamilyMember } from "./family-member";
import { Reward } from "./reward";
import { Transaction } from "./transaction";

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
    achievements?: Achievement[];
    stripeCustomerId?: string;
    rewards?: Reward[];
    familyMembers?: FamilyMember[];
    relatedByFamily?: FamilyMember[];
    subscriptions?: MemberSubscription[];
    payers?: MemberSubscription[];
    packages?: MemberPackage[];
    packagePayers?: MemberPackage[];
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};

type MemberSubscriptionStatus = 'active' | 'incomplete' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | 'unpaid'

export type MemberSubscription = {
    id?: number;
    payerId: number | null;
    beneficiaryId: number;
    planId: number | null;
    startDate: Date;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAt?: Date | null;
    cancelAtPeriodEnd?: boolean;
    locationId: number;
    stripeSubscriptionId?: string | null;
    trialEnd?: Date | null;
    endedAt?: Date | null;
    paymentType: string;
    plan?: MemberPlan | null;
    payer?: Member | null;
    beneficiary?: Member;
    metadata?: Record<string, any>;
    invoices?: MemberInvoice[];
    status: MemberSubscriptionStatus;
    created: Date;
    updated?: Date | null;
}

export type MemberPackage = {
    id?: string;
    memberPlanId: number;
    locationId: number;
    payerId: number | null;
    beneficiaryId: number;
    startDate: Date;
    endDate: Date | null;
    expireDate: Date | null;
    status: 'active' | 'expired' | 'incomplete' | 'completed';
    paymentMethod: string;
    totalClassAttended?: number;
    totalClassLimit: number;
    metadata?: Record<string, any>;
    plan?: MemberPlan;
    payer?: Member;
    beneficiary?: Member;
    transactions?: Transaction[];
    created: Date;
    updated?: Date;
};

export type MemberPlan = {
    id?: number;
    name: string;
    description: string;
    // status?: boolean;
    // vendorId: number;
    family: boolean;
    programId: number;
    familyMemberLimit: number;
    contractId?: number | null;
    contract?: Contract | undefined;
    interval: 'day' | 'week' | 'month' | 'year' | null;
    intervalThreshold: number | null;
    type: 'recurring' | 'one-time';
    currency: string;
    price: number;
    totalClassLimit: number | null;
    intervalClassLimit: number | null;
    stripePriceId: string | null;
    expireDate: Date | null;
    allowProration: boolean;
    billingAnchorConfig: Record<string, any> | null;
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};


export type MemberInvoice = {
    id?: string;
    settings?: Record<string, any>;
    currency: string | null;
    memberId: number;
    locationId: number;
    description: string | null;
    items: Record<string, any>[];
    paid: boolean;
    tax: number;
    total: number;
    discount: number;
    subtotal: number;
    dueDate: Date | null;
    attemptCount: number;
    invoicePdf?: string | null;
    memberPackageId?: string | null;
    memberPackage?: MemberPackage | null;
    memberSubscriptionId?: number | null;
    memberSubscription?: MemberSubscription | null;
    status: string;
    created: Date;
    updated?: Date | null;
};
