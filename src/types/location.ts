import { LocationStatus } from "./enums";
import { MemberInvoice, MemberSubscription } from "./member";
import { Transaction } from "./transaction";


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
    locationState?: LocationState;
    memberInvoices?: MemberInvoice[];
    memberSubscriptions?: MemberSubscription[];
    transactions?: Transaction[];
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
    startDate: Date | null;
    settings: LocationSettings;
    usagePercent: number;
    status: LocationStatus;
    created: Date;
    updated: Date | null;
}

export type LocationSettings = {
    aiBotTotal: number;
}


