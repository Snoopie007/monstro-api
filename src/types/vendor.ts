<<<<<<< HEAD

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
=======
import {VendorReferral} from "./VendorReferral";

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
};

export type VendorLevel = {
  id: number;
  vendorId: number;
  vendor?: Vendor;
  points: number;
  totalPoints: number;
  badges?: VendorBadge[];
  claimedRewards: VendorClaimedReward[];
  created: Date;
  updated: Date | null;
};

export type VendorBadge = {
  vendorLevelId: number;
  badgeId: number;
  progress: number;
  completed: boolean;
  created: Date;
  claimed: Date | null;
};

export type VendorReward = {
  id: number;
  name: string;
  images: string[];
  description: string;
  requiredPoints: number;
  meta: Record<string, unknown>;
};

export type VendorClaimedReward = {
  vendorLevelId: number;
  rewardId: number;
  claimed: Date | null;
  reward?: VendorReward;
};

export type VendorSupportPlan = {
  id: number;
  name: string;
  price: number;
  supportCalls: boolean;
  sessionsPerMonth: number;
  created: Date;
  updated: Date | null;
};
>>>>>>> 22125ebf9f92d05da0f1397f845bbaa8d79a1fe6
