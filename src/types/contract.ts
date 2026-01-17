import { contractTemplates } from "@/db/schemas/contracts";
import { memberContracts } from "@/db/schemas/members";
import type { Location } from "./location";
import type { MemberSubscription, MemberPackage, Member } from "./member";

export type Contract = typeof contractTemplates.$inferSelect & {
    location?: Location;
    signedContract?: MemberContract;
    planName?: string;
    memberPlanId?: string;
    pricingId?: string;
    signedOn?: Date;
}


export type MemberContract = typeof memberContracts.$inferSelect & {
    member?: Member;
    subscription?: MemberSubscription;
    package?: MemberPackage;
    contractTemplate?: Contract;
    location?: Location;
}
