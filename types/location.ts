import type {
  MemberInvoice,
  MemberSubscription,
  MemberReferral,
  PaymentType,
  MemberPointsHistory,
  Program,
  TaxRate,
  Transaction,
  Wallet,
} from ".";
import { locations, locationState } from "../schemas/locations";
import type { MemberPlan } from "./member";

export type Location = typeof locations.$inferSelect & {
  locationState?: LocationState;
  programs?: Program[];
  memberInvoices?: MemberInvoice[];
  memberSubscriptions?: MemberSubscription[];
  pointsHistory?: MemberPointsHistory[];
  referrals?: MemberReferral[];
  transactions?: Transaction[];
  wallet?: Wallet;
  taxRates?: TaxRate[];
  memberPlans?: MemberPlan[];
};

export type LocationState = typeof locationState.$inferSelect & {
  settings: LocationSettings;
}


export type HolidayBehavior = 'block_all' | 'block_new_only' | 'notify_only';

export type HolidaySettings = {
  blockedHolidays: number[];
  defaultBehavior: HolidayBehavior;
  advanceBlockDays: number;
  autoNotifyMembers: boolean;
};

export type LocationSettings = {
  theme: 'default';
  passOnFees: boolean;
  processingMethods: PaymentType[];
  holidays?: HolidaySettings;
}
