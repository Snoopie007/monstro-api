import { Contract } from "./contract";

export type Plan = {
    id?: number;
    name: string;
    description: string;
    status?: boolean;
    vendorId: number;
    family: boolean;
    programId: number;
    familyMemberLimit: number;
    pricing: Pricing;
    contractId?: number | null;
    contract?: Contract | undefined;
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};

export type Pricing = {
    amount: number;
    billingPeriod: string;
    id?: number;
    memberPlanId: number;
    stripePriceId: string;
}

