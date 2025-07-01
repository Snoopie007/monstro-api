
import { supportPlans, vendorBadges, vendorClaimedRewards, vendorLevels, vendorRewards, vendors } from "@/db/schemas";
import { VendorReferral } from "./VendorReferral";



export type Vendor = typeof vendors.$inferInsert & {
    referrals?: VendorReferral[];
    vendorLevel?: VendorLevel;
    created: Date;
    updated: Date | null;
    deleted: Date | null;
}


export type VendorLevel = typeof vendorLevels.$inferInsert & {
    vendor?: Vendor;
    badges?: VendorBadge[];
    claimedRewards?: VendorClaimedReward[];
}


export type VendorBadge = typeof vendorBadges.$inferInsert & {
    vendorLevel?: VendorLevel;
}

export type VendorReward = typeof vendorRewards.$inferInsert & {
    vendorLevel?: VendorLevel;
}

export type VendorClaimedReward = typeof vendorClaimedRewards.$inferInsert & {
    vendorLevel?: VendorLevel;
    reward?: VendorReward;
}

export type VendorSupportPlan = typeof supportPlans.$inferInsert & {
    vendor?: Vendor;
}
