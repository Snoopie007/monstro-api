import { Contract, MemberContract } from "./contract";
import { FamilyMember } from "./FamilyMember";
import { Transaction } from "./transaction";
import { Location } from "./location";
import { PlanProgram } from "./program";
import { importMembers, memberInvoices, memberLocations, memberPackages, memberPlans, memberReferrals, members, memberSubscriptions } from "@/db/schemas";

export type Member = typeof members.$inferSelect & {
  familyMembers?: FamilyMember[];
  relatedByFamily?: FamilyMember[];
  memberLocation?: MemberLocation;
  subscriptions?: MemberSubscription[];
  packages?: MemberPackage[];
  referrals?: MemberReferral[];
  reedemPoints?: number;
  referredBy?: MemberReferral;
};


export type MemberSubscription = typeof memberSubscriptions.$inferSelect & {
  child?: MemberSubscription | null;
  invoices?: MemberInvoice[];
  plan?: MemberPlan;
  contract?: MemberContract | null;
  member?: Member;
};

export type MemberPackage = typeof memberPackages.$inferSelect & {

  invoice?: MemberInvoice | null;
  plan?: MemberPlan;
  contract?: MemberContract | null;
  member?: Member;
  parent?: MemberPackage | null;
  transactions?: Transaction[];
};

export type BillingCycleAnchorConfig = {
  day_of_month: number;
  hour?: number;
  minute?: number;
  month?: number;
  second?: number;
}

export type MemberPlan = typeof memberPlans.$inferSelect & {
  contract?: Contract | undefined;
  billingAnchorConfig: BillingCycleAnchorConfig | null;
  planPrograms?: PlanProgram[];
  member?: Member;
};


export type MemberInvoice = typeof memberInvoices.$inferSelect & {
  member?: Member;
  location?: Location;
  memberPackage?: MemberPackage | null;
  memberSubscription?: MemberSubscription | null;
};

export type MemberLocation = typeof memberLocations.$inferSelect & {
  location?: Location;
  member?: Member;
}



export type FamilyPlan = {
  planName: string;
  planId: number;
  subscriptionId?: number;
  packageId?: number;
};

export type ImportMember = typeof importMembers.$inferSelect & {

}

export type MemberPointsHistory = {
  id: string;
  memberId: string;
  locationId: string;
  points: number;
  type: string;
  removed: boolean;
  removedReason: string | null;
  removedOn: Date | null;
  created: Date;
  updated: Date | null;
};

export type MemberReferral = typeof memberReferrals.$inferSelect & {
  member?: Member;
  referred?: Member;
  location?: Location;
}


