import {
  vendorBadges, vendorClaimedRewards,
  vendorLevels, vendorRewards
} from "../schemas/VendorProgress";
import { vendorReferrals } from "../schemas/VendorReferrals";
import {
  supportPlans, vendors
} from "../schemas/vendors";

import type { Location } from "./location";
import type { User } from "./user";



export type Vendor = typeof vendors.$inferSelect & {
  referrals?: VendorReferral[];
  vendorLevel?: VendorLevel;
  user?: User;
  locations?: Location[];
}

export type VendorReferral = typeof vendorReferrals.$inferSelect & {
  vendor?: Vendor;
  referred?: Partial<Vendor>;
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
