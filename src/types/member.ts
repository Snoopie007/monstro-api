import { Contract, MemberContract } from "./contract";
import { FamilyMember } from "./FamilyMember";
import { ProgramLevel } from "./program";
import { Transaction } from "./transaction";
import { Location } from "./location";
import { Interval, PlanType, LocationStatus, InvoiceStatus, PackageStatus, PaymentMethod } from "./enums";

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


export type MemberSubscription = {
    id?: number;
    payerId: number | null;
    beneficiaryId: number;
    memberPlanId: number;
    memberContractId?: number | null;
    startDate: Date;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    invoiceId?: string | null;
    cancelAt?: Date | null;
    cancelAtPeriodEnd?: boolean;
    locationId: number;
    programLevelId: number;
    stripeSubscriptionId?: string | null;
    trialEnd?: Date | null;
    endedAt?: Date | null;
    paymentMethod: PaymentMethod;
    programLevel?: ProgramLevel;
    plan?: MemberPlan;
    payer?: Member | null;
    beneficiary?: Member;
    metadata?: Record<string, unknown>;
    invoices?: MemberInvoice[];
    contract?: MemberContract | null;
    status: LocationStatus;
    created?: Date;
    updated?: Date | null;
}

export type MemberPackage = {
    id?: string;
    memberPlanId: number;
    locationId: number;
    payerId: number | null;
    beneficiaryId: number;
    invoiceId?: string | null;
    memberContractId?: number | null;
    startDate: Date;
    expireDate: Date | null;
    status: PackageStatus;
    paymentMethod: PaymentMethod;
    totalClassAttended?: number;
    totalClassLimit: number;
    metadata?: Record<string, unknown>;
    programLevelId: number;
    programLevel?: ProgramLevel;
    invoice?: MemberInvoice | null;
    plan?: MemberPlan;
    contract?: MemberContract | null;
    payer?: Member;
    beneficiary?: Member;
    transactions?: Transaction[];
    created: Date;
    updated?: Date;
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
    programId: number;
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
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};


export type MemberInvoice = {
    id?: string;
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
    memberPackageId?: string | null;
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
    location: Location;
    inviteDate: Date | null;
    stripeCustomerId: string | null;
    inviteAcceptedDate: Date | null;
    incompletePlan?: IncompletePlan | null;
    created: Date;
    updated: Date | null;
}

export type IncompletePlan = {
    programId: number | undefined;
    programLevelId: number | undefined;
    memberPlanId: number | undefined;
    currentStep: number;
    memberContractId: number | undefined;
    completedSteps: number[];
}