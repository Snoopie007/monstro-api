
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
    icon: string | null;
    credits: number;
    spendedCredits: number;
    userId: number;
    referrals?: VendorReferral[];
    vendorProgress?: VendorProgress;
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
    priceId: string;
}

export type MonstroPlan = {
    id: number;
    name: string;
    price: number;
    interval: string;
    benefits: { name: string, description?: string }[];
    description: string;
    priceId: string;
    note?: string;
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
