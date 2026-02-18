import type {
  MemberInvoice,
  MemberSubscription,
  PaymentType,
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
  transactions?: Transaction[];
  wallet?: Wallet;
  memberPlans?: MemberPlan[];
  taxRates?: TaxRate[];
  taxRate?: TaxRate;
};



export type LocationState = typeof locationState.$inferSelect & {
  settings: LocationSettings;
}


export type LocationSettings = {
  theme: 'default';
  passOnFees: boolean;
  processingMethods: PaymentType[];
}