import { locationState, locations } from "@/db/schemas/locations";
import {
  MemberInvoice,
  MemberReferral,
  MemberSubscription,
} from "./member";

import { Program } from "./program";
import { Transaction } from "./transaction";
import { Wallet } from "./wallet";
import { MemberPointsHistory } from "./achievement";

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

export type LocationState = typeof locationState.$inferSelect
