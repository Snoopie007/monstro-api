import type {
  Wallet,
  Program,
  MemberInvoice,
  MemberSubscription,
  Transaction,
} from ".";
import { locations, locationState } from "@/db/schemas/locations";
import type { MemberPlan } from "./member";

export type Location = typeof locations.$inferSelect & {
  locationState?: LocationState;
  programs?: Program[];
  memberInvoices?: MemberInvoice[];
  memberSubscriptions?: MemberSubscription[];
  transactions?: Transaction[];
  wallet?: Wallet;
  memberPlans?: MemberPlan[];
};

export type LocationState = typeof locationState.$inferSelect;

export type LocationSettings = {
  aibotsCount: number;
};
