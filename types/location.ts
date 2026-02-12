import {
  locationState,
  locations,
} from "@subtrees/schemas/locations";
import { MemberInvoice, MemberPlan, MemberReferral, MemberSubscription } from "./member";

import { Program } from "./program";
import { Transaction } from "./transaction";
import { Wallet } from "./wallet";
import { MemberPointsHistory } from "./achievement";
import { PaymentType } from "./DatabaseEnums";
import { TaxRate } from "./tax";

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
