
export type Location = {
    id: number;
    name: string;
    legalName: string | null;
    industry: string | null;
    address: string | null;
    email: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    website: string | null;
    country: string | null;
    phone: string | null;
    metadata: Record<string, any> | null;
    logoUrl: string | null;
    timezone: string | null;
    status: string | null;
    vendorId: number;
    progress: LocationProgress;
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};

export type LocationProgress = {
    planId: number | null;
    pkgId: number | null;
    paymentPlanId: number | null;
    aibotCounts: number | null;
    agreedToTerms: boolean;
}