import {
  locationState,
  locations,
} from "@/db/schemas/locations";
import { MemberInvoice, MemberReferral, MemberSubscription } from "./member";

import { Program } from "./program";
import { Transaction } from "./transaction";
import { Wallet } from "./wallet";
import { MemberPointsHistory } from "./achievement";
import { PaymentType } from "./DatabaseEnums";

export type Location = typeof locations.$inferSelect & {
  locationState?: LocationState;
  programs?: Program[];
  memberInvoices?: MemberInvoice[];
  memberSubscriptions?: MemberSubscription[];
  pointsHistory?: MemberPointsHistory[];
  referrals?: MemberReferral[];
  transactions?: Transaction[];
  wallet?: Wallet;
};

export type LocationState = typeof locationState.$inferSelect & {
  settings: LocationSettings;
}


export type LocationSettings = {
  theme: 'default';
  passOnFees: boolean;
  processingMethods: PaymentType[];
  taxRates: TaxRate[] | null;
}

export type TaxRate = {
  name: string;
  percentage: number;
  stripeRateId: string | null;
  country: string;
  state: string;
  status: 'active' | 'inactive';
}