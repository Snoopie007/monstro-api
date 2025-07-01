import {LocationStatus} from "./DatabaseEnums";
import {
  MemberInvoice,
  MemberPointsHistory,
  MemberReferral,
  MemberSubscription,
} from "./member";
import {Program} from "./program";
import {Transaction} from "./transaction";
import {Wallet} from "./wallet";

export type Location = {
  id: number;
  name: string;
  vendorId: number;
  legalName: string | null;
  slug: string;
  industry: string | null;
  address: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  website: string | null;
  country: string | null;
  phone: string | null;
  metadata: unknown;
  logoUrl: string | null;
  timezone: string | null;
  locationState?: LocationState;
  programs?: Program[];
  memberInvoices?: MemberInvoice[];
  memberSubscriptions?: MemberSubscription[];
  pointsHistory?: MemberPointsHistory[];
  referrals?: MemberReferral[];
  transactions?: Transaction[];
  wallet?: Wallet;
  created: Date;
  updated: Date | null;
};

export type LocationState = {
  locationId: number;
  planId: number | null;
  pkgId: number | null;
  paymentPlanId: number | null;
  agreeToTerms: boolean;
  lastRenewalDate: Date | null;
  startDate: Date | null;
  taxRate: number;
  settings: LocationSettings;
  usagePercent: number;
  status: LocationStatus;
  created: Date;
  updated: Date | null;
};

export type LocationSettings = {
  aibotsCount: number;
};
