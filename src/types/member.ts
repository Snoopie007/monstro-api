import { Achievement } from "./achievement";
import { FamilyMember } from "./family-member";
import { Plan } from "./plan";
import { Reward } from "./reward";

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
    familyMembers?: Array<FamilyMember>;
    relatedByFamily?: Array<FamilyMember>;
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};


type MemberSubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due' | 'pending'

export type MemberSubscription = {
    id: number;
    payerId: number;
    beneficiaryId: number;
    planId: number;
    activationDate: Date;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAt: Date | null;
    cancelAtPeriodEnd: boolean;
    trialEnd: Date | null;
    endedAt: Date | null;
    created: Date;
    updated: Date | null;
    plan?: Plan;
    payer?: Member;
    beneficiary?: Member;
    status: MemberSubscriptionStatus
}
