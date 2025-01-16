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
    contractId?: number;
};

export type Pricing = {
    amount: number;
    billingPeriod: string;
    id?: number;
    stripePlanId?: string;
    stripePriceId?: string;
}

