export type Plan = {
    id?: number;
    name: string;
    description: string;
    status?: boolean;
    vendor_id: number;
    family: boolean;
    program_id: number;
    family_member_limit: number;
    pricing: Pricing;
    contractId?: number;
};

export type Pricing = {
    amount: number;
    billing_period: string;
    id?: number;
    stripe_plan_id?: string;
    stripe_price_id?: string;
}