import { contractTemplates, memberContracts } from "../schemas";
import type { Location } from "./location";
import type { Member, MemberPackage, MemberPlanPricing, MemberSubscription } from "./member";

export type Contract = typeof contractTemplates.$inferSelect & {
    location?: Location;
}

export type MemberContract = typeof memberContracts.$inferSelect & {
    member?: Member;
    subscription?: MemberSubscription | null;
    package?: MemberPackage | null;
    contractTemplate?: Contract;
    location?: Location;
    pricing?: MemberPlanPricing;
}
