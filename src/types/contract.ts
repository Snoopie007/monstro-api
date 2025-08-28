import { contractTemplates } from "@/db/schemas/contracts";
import { memberContracts } from "@/db/schemas/members";
import type { Location } from "./location";
import type { MemberSubscription, MemberPackage, Member } from "./member";

export type Contract = typeof contractTemplates.$inferSelect & {
    location?: Location;
}


export type MemberContract = typeof memberContracts.$inferSelect & {
    member?: Member;
    contract?: Contract;
    subscription?: MemberSubscription | null;
    package?: MemberPackage | null;
    contractTemplate?: Contract;
    location?: Location;
}
