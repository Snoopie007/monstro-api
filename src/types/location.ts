
import { MemberInvoice, MemberPointsHistory, MemberReferral, MemberSubscription } from "./member";
import { Program } from "./program";
import { Transaction } from "./transaction";
import { Vendor } from "./vendor";
import { Wallet } from "./wallet";
import { locations, locationState } from "@/db/schemas";

export type Location = typeof locations.$inferInsert & {
    locationState?: LocationState;
    programs?: Program[];
    memberInvoices?: MemberInvoice[];
    memberSubscriptions?: MemberSubscription[];
    pointsHistory?: MemberPointsHistory[];
    referrals?: MemberReferral[];
    transactions?: Transaction[];
    wallet?: Wallet;
    vendor?: Vendor;
};

export type LocationState = typeof locationState.$inferInsert & {
    location?: Location;
}

export type LocationSettings = {
    aibotsCount: number;
}


