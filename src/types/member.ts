<<<<<<< HEAD
import { Contract, MemberContract } from "./contract";
import { FamilyMember } from "./FamilyMember";
import { Transaction } from "./transaction";
import { Location } from "./location";
import { LocationStatus, InvoiceStatus } from "./DatabaseEnums";
import { PlanProgram } from "./program";
import { importMembers, memberInvoices, memberLocations, memberPackages, memberPlans, memberReferrals, members, memberSubscriptions } from "@/db/schemas";

export type Member = typeof members.$inferInsert & {
    familyMembers?: FamilyMember[];
    relatedByFamily?: FamilyMember[];
    memberLocation?: MemberLocation;
    subscriptions?: MemberSubscription[];
    packages?: MemberPackage[];
    referrals?: MemberReferral[];
    referredBy?: MemberReferral;
};


export type MemberSubscription = typeof memberSubscriptions.$inferInsert & {
    child?: MemberSubscription | null;
    invoices?: MemberInvoice[];
    contract?: MemberContract | null;
    member?: Member;
};

export type MemberPackage = typeof memberPackages.$inferInsert & {

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

export type MemberPlan = typeof memberPlans.$inferInsert & {
    contract?: Contract | undefined;
    billingAnchorConfig: BillingCycleAnchorConfig | null;
    planPrograms?: PlanProgram[];
    member?: Member;
};


export type MemberInvoice = typeof memberInvoices.$inferInsert & {
    member?: Member;
    location?: Location;
    memberPackage?: MemberPackage | null;
    memberSubscription?: MemberSubscription | null;
};

export type MemberLocation = typeof memberLocations.$inferInsert & {
    location?: Location;
    member?: Member;
}


=======
import {Contract, MemberContract} from "./contract";
import {FamilyMember} from "./FamilyMember";
import {Transaction} from "./transaction";
import {Location} from "./location";
import {
  Interval,
  PlanType,
  LocationStatus,
  InvoiceStatus,
  PackageStatus,
  PaymentMethod,
} from "./DatabaseEnums";
import {PlanProgram} from "./program";

export type Member = {
  id?: number;
  firstName: string;
  lastName: string | null;
  email: string;
  referralCode: string;
  currentPoints: number;
  reedemPoints?: number;
  avatar: string | null;
  phone: string | null;
  activityStatus?: string;
  stripeCustomerId: string | null;
  familyMembers?: FamilyMember[];
  relatedByFamily?: FamilyMember[];
  memberLocation?: MemberLocation;
  subscriptions?: MemberSubscription[];
  packages?: MemberPackage[];
  referrals?: MemberReferral[];
  referredBy?: MemberReferral;
  created: Date;
  updated: Date | null;
};

export type MemberSubscription = {
  id?: number;
  memberId: number;
  parentId?: number | null;
  memberPlanId: number;
  memberContractId?: number | null;
  startDate: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  invoiceId?: string | null;
  cancelAt?: Date | null;
  cancelAtPeriodEnd?: boolean;
  locationId: number;
  stripeSubscriptionId?: string | null;
  trialEnd?: Date | null;
  endedAt?: Date | null;
  paymentMethod: PaymentMethod;
  plan?: MemberPlan;
  member?: Member;
  child?: MemberSubscription | null;
  metadata?: Record<string, unknown>;
  invoices?: MemberInvoice[];
  contract?: MemberContract | null;
  status: LocationStatus;
  created?: Date;
  updated?: Date | null;
};

export type MemberPackage = {
  id?: number;
  memberPlanId: number;
  locationId: number;
  memberId: number;
  parentId?: number | null;
  invoiceId?: string | null;
  memberContractId?: number | null;
  startDate: Date;
  expireDate: Date | null;
  status: PackageStatus;
  paymentMethod: PaymentMethod;
  stripePaymentId?: string | null;
  totalClassAttended?: number;
  totalClassLimit: number;
  metadata?: Record<string, unknown>;
  invoice?: MemberInvoice | null;
  plan?: MemberPlan;
  contract?: MemberContract | null;
  member?: Member;
  parent?: MemberPackage | null;
  transactions?: Transaction[];
  created: Date;
  updated?: Date | null;
};

export type BillingCycleAnchorConfig = {
  day_of_month: number;
  hour?: number;
  minute?: number;
  month?: number;
  second?: number;
};

export type MemberPlan = {
  id?: number;
  name: string;
  description: string;
  archived: boolean;
  family: boolean;
  familyMemberLimit: number;
  contractId?: number | null;
  contract?: Contract | undefined;
  interval: Interval | null;
  intervalThreshold: number | null;
  type: PlanType;
  currency: string;
  price: number;
  totalClassLimit: number | null;
  classLimitInterval: Interval | null;
  classLimitThreshold: number | null;
  stripePriceId: string | null;
  expireInterval: Interval | null;
  expireThreshold: number | null;
  allowProration: boolean;
  billingAnchorConfig: BillingCycleAnchorConfig | null;
  planPrograms?: PlanProgram[];
  created: Date;
  updated: Date | null;
  metadata?: Record<string, any>;
  newPlan?: boolean;
};

export type MemberInvoice = {
  id?: number;
  settings?: Record<string, unknown>;
  currency: string | null;
  memberId: number;
  locationId: number;
  description: string | null;
  items: Record<string, unknown>[];
  paid: boolean;
  tax: number;
  total: number;
  discount: number;
  subtotal: number;
  dueDate?: Date;
  forPeriodStart?: Date | null;
  forPeriodEnd?: Date | null;
  attemptCount?: number;
  invoicePdf?: string | null;
  memberPackageId?: number | null;
  memberPackage?: MemberPackage | null;
  memberSubscriptionId?: number | null;
  memberSubscription?: MemberSubscription | null;
  status: InvoiceStatus;
  created?: Date;
  updated?: Date | null;
};

export type MemberLocation = {
  id?: number;
  memberId: number;
  locationId: number;
  status: LocationStatus;
  location?: Location;
  inviteDate: Date | null;
  inviteAcceptedDate: Date | null;
  member?: Member;
  created: Date;
  updated: Date | null;
};

export type IncompletePlan = {
  memberPlanId: number | undefined;
  memberContractId: number | undefined;
};
>>>>>>> 22125ebf9f92d05da0f1397f845bbaa8d79a1fe6

export type FamilyPlan = {
  planName: string;
  planId: number;
  subscriptionId?: number;
  packageId?: number;
};

<<<<<<< HEAD
export type ImportMember = typeof importMembers.$inferInsert & {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    lastRenewalDay: Date;
    status: string;
    created: Date;
    updated: Date | null;
    planId: number | null;
    memberId: number | null;
    isPrimaryMember: boolean;
    locationId: number;
}
=======
export type ImportMember = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  lastRenewalDay: Date;
  status: string;
  created: Date;
  updated: Date | null;
  planId: number | null;
  memberId: number | null;
  isPrimaryMember: boolean;
  locationId: number;
};
>>>>>>> 22125ebf9f92d05da0f1397f845bbaa8d79a1fe6

export type MemberPointsHistory = {
  id: number;
  memberId: number;
  locationId: number;
  points: number;
  type: string;
  removed: boolean;
  removedReason: string | null;
  removedOn: Date | null;
  created: Date;
  updated: Date | null;
};

<<<<<<< HEAD
export type MemberReferral = typeof memberReferrals.$inferInsert & {
    member?: Member;
    referred?: Member;
    location?: Location;
}


=======
export type MemberReferral = {
  memberId: number;
  referredMemberId: number;
  locationId: number;
  created: Date;
  updated: Date | null;
};
>>>>>>> 22125ebf9f92d05da0f1397f845bbaa8d79a1fe6
