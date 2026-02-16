import { Location } from "./location";
import { Member, MemberPackage } from "./member";
import { MemberSubscription } from "./member";
import { contractTemplates, memberContracts } from "@subtrees/schemas";

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
    subscription?: MemberSubscription | null;
    package?: MemberPackage | null;
    contractTemplate?: Contract;
    location?: Location;
    contract?: Contract;
    pdfUrl?: string;
}
