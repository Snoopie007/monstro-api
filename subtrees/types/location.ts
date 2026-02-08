import type {
  Wallet,
  Program,
  MemberInvoice,
  MemberSubscription,
  Transaction,
  PaymentType,
  TaxRate,
} from ".";
import { locations, locationState } from "subtrees/schemas/locations";
import type { MemberLocation, MemberPlan, MigrateMember } from "./member";

export type Location = typeof locations.$inferSelect & {
  locationState?: LocationState;
  programs?: Program[];
  memberInvoices?: MemberInvoice[];
  memberSubscriptions?: MemberSubscription[];
  transactions?: Transaction[];
  wallet?: Wallet;
  memberPlans?: MemberPlan[];
  taxRates?: TaxRate[];
};



export type LocationState = typeof locationState.$inferSelect & {
  settings: LocationSettings;
}


export type LocationSettings = {
  theme: 'default';
  passOnFees: boolean;
  processingMethods: PaymentType[];
}
