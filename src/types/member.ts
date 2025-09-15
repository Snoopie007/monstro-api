import { memberInvoices, members } from "@/db/schemas";
import type {
  MemberContract,
  Contract,
  Transaction,
  Location,
  FamilyMember,
  PlanProgram,
  User,
} from ".";
import {
  memberPackages,
  memberPlans,
  memberSubscriptions,
} from "@/db/schemas/MemberPlans";
import { memberLocations } from "@/db/schemas/locations";
import { importMembers } from "@/db/schemas/ImportedMember";

export type Member = typeof members.$inferSelect & {
  familyMembers?: FamilyMember[];
  relatedByFamily?: FamilyMember[];
  memberLocations?: MemberLocation[];
  subscriptions?: MemberSubscription[];
  packages?: MemberPackage[];
  reedemPoints?: number;
  user?: User;
};

export type MemberSubscription = typeof memberSubscriptions.$inferSelect & {
  child?: MemberSubscription | null;
  invoices?: MemberInvoice[];
  location?: Location;
  plan?: MemberPlan;
  contract?: MemberContract | null;
  member?: Member;
};

export type MemberPackage = typeof memberPackages.$inferSelect & {
  invoice?: MemberInvoice | null;
  location?: Location;
  plan?: MemberPlan;
  contract?: MemberContract | null;
  member?: Member;
  parent?: MemberPackage | null;
  transactions?: Transaction[];
  invoices?: MemberInvoice[];
};

export type BillingCycleAnchorConfig = {
  day_of_month: number;
  hour?: number;
  minute?: number;
  month?: number;
  second?: number;
};

export type MemberPlan = typeof memberPlans.$inferSelect & {
  contract?: Contract | null;
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
  location?: Partial<Location>;
  member?: Member;
};

export type FamilyPlan = {
  planName: string;
  planId: string;
  subscriptionId?: string;
  packageId?: string;
};

export type IncompletePlan = {
  memberPlanId: string | undefined;
  memberContractId: string | undefined;
};

export type ImportMember = typeof importMembers.$inferSelect & {
  plan?: MemberPlan | null;
};
