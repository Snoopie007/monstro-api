import { Achievement } from "./achievement";
import { Contract } from "./contract";
import { FamilyMember } from "./family-member";
import { ProgramLevel } from "./program";
import { Program } from "./program";
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
    memberLocation?: MemberLocation;
    subscriptions?: MemberSubscription[];
    payers?: MemberSubscription[];
    packages?: MemberPackage[];
    packagePayers?: MemberPackage[];
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};
export type MemberOnboarding = {
    selectProgramId: number | null;
    selectPlanId: number | null;
    completedSteps: number[];
    currentStep: number;
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
    programLevelId: number;
    stripeSubscriptionId?: string | null;
    trialEnd?: Date | null;
    endedAt?: Date | null;
    paymentType: string;
    programLevel?: ProgramLevel;
    plan?: MemberPlan | null;
    payer?: Member | null;
    beneficiary?: Member;
    metadata?: Record<string, any>;
    invoices?: MemberInvoice[];
    status: MemberSubscriptionStatus;
    created?: Date;
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
    totalClassAttended: number;
    totalClassLimit: number;
    metadata?: Record<string, any>;
    programLevelId: number;
    programLevel?: ProgramLevel;
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
    archived: boolean;
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
    classLimitInterval: 'week' | 'month' | 'year' | null;
    classLimitThreshold: number | null;
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
    dueDate?: Date;
    forPeriodStart?: Date | null;
    forPeriodEnd?: Date | null;
    attemptCount?: number;
    invoicePdf?: string | null;
    memberPackageId?: string | null;
    memberPackage?: MemberPackage | null;
    memberSubscriptionId?: number | null;
    memberSubscription?: MemberSubscription | null;
    status: 'draft' | 'paid' | 'unpaid' | 'uncollectible' | 'void';
    created?: Date;
    updated?: Date | null;
};

export type MemberLocation = {
    id?: number;
    memberId: number;
    locationId: number;
    status: 'incomplete' | 'active' | 'inactive' | 'canceled' | 'paused' | 'archived';
    progress: MemberOnboarding;
    created: Date;
    updated: Date | null;
    deleted: Date | null;
}
