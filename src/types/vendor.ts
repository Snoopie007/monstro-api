import { VendorReferral } from "./vendor-referral";



export type Vendor = {
    id: number;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    stripeCustomerId: string | null;
    companyName: string | null;
    companyEmail: string | null;
    companyWebsite: string | null;
    companyAddress: string | null;
    logo: string | null;
    planId: number | null;
    isNew: boolean;
    credits: number;
    spendedCredits: number;
    userId: number;
    referrals?: VendorReferral[];
    vendorProgress?: VendorProgress;
    created: Date;
    updated: Date | null;
    deleted: Date | null;
}

export type VendorProgress = {
    id: number;
    vendorId: number;
    locationId: number | null;
    vendor?: Vendor;
    points: number;
    totalPoints: number;
    badges?: VendorBadge[];
    claimedRewards: VendorClaimedReward[];
    created: Date;
    updated: Date | null;
}


export type VendorBadge = {
    vendorProgressId: number;
    badgeId: number;
    progress: number;
    completed: boolean;
    created: Date;
    claimed: Date | null;
}

export type VendorReward = {
    id: number;
    name: string;
    images: string[];
    description: string;
    requiredPoints: number;
    meta: Record<string, any>;
}

export type VendorClaimedReward = {
    vendorProgressId: number;
    rewardId: number;
    claimed: Date | null;
    reward?: VendorReward;
}
