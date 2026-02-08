import { contractTemplates } from "subtrees/schemas/contracts";
import { memberContracts } from "subtrees/schemas/members";
import type { Location } from "./location";
import type { MemberSubscription, MemberPackage, Member } from "./member";

export type Contract = typeof contractTemplates.$inferSelect & {
    location?: Location;
    planName?: string;
    memberPlanId?: string;
    signedContractId?: string;
    signedContractPdf?: string;
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
