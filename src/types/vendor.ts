
import { VendorReferral } from "./VendorReferral";



export type Vendor = {
    id: number;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    email: string | null;
    stripeCustomerId: string | null;
    avatar: string | null;
    userId: number;
    referrals?: VendorReferral[];
    vendorLevel?: VendorLevel;
    created: Date;
    updated: Date | null;
    deleted: Date | null;
}


export type VendorLevel = {
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
    vendorLevelId: number;
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
    meta: Record<string, unknown>;
}

export type VendorClaimedReward = {
    vendorLevelId: number;
    rewardId: number;
    claimed: Date | null;
    reward?: VendorReward;
}
