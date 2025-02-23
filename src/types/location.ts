
export type Location = {
    id: number;
    name: string;
    vendorId: number;
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
    locationState: LocationState;
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};

export type LocationState = {
    locationId: number;
    planId: number | null;
    pkgId: number | null;
    paymentPlanId: number | null;
    agreeToTerms: boolean;
    lastRenewalDate: Date | null;
    activationDate: Date | null;
    metadata: Record<string, any> | null;
    status: string;
    created: Date;
    updated: Date | null;
}
