
import { supportPlans, vendorBadges, vendorClaimedRewards, vendorLevels, vendorRewards, vendors } from "@subtrees/schemas";
import { VendorReferral } from "./vendor/VendorReferral";
import { User } from "./user";
import { Location } from "./location";



export type Vendor = typeof vendors.$inferSelect & {
  referrals?: VendorReferral[];
  vendorLevel?: VendorLevel;
  user?: User;
  locations?: Location[];
}


export type VendorLevel = typeof vendorLevels.$inferSelect & {
  vendor?: Vendor;
  badges?: VendorBadge[];
  claimedRewards?: VendorClaimedReward[];
}


export type VendorBadge = typeof vendorBadges.$inferSelect & {
  vendorLevel?: VendorLevel;
}

export type VendorReward = typeof vendorRewards.$inferSelect & {
  vendorLevel?: VendorLevel;
}

export type VendorClaimedReward = typeof vendorClaimedRewards.$inferSelect & {
  vendorLevel?: VendorLevel;
  reward?: VendorReward;
}

export type VendorSupportPlan = typeof supportPlans.$inferSelect & {
  vendor?: Vendor;
}
