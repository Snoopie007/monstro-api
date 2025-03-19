
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

export type MonstroPackage = {
    id: number;
    name: string;
    description: string;
    price: number;
    benefits: { name: string, description?: string }[];
    paymentPlans: PackagePaymentPlan[];
}

export type PackagePaymentPlan = {
    id: number;
    name: string;
    description: string;
    downPayment: number;
    monthlyPayment: number;
    length: number;
    interval: string;
    discount: number;
    trial: number;

    priceId: string | undefined;
}

export type MonstroPlan = {
    id: number;
    name: string;
    price: number;
    usagePercent: number;
    threshold: number;
    interval: string;
    benefits: { name: string, description?: string }[];
    description: string;
    priceId: string | undefined;
    aiBots: number;
    note?: string;
    coupon?: string;
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
