
import { Location } from "./location";
import { Member, MemberPackage } from "./member";
import { MemberSubscription } from "./member";
import { contractTemplates, memberContracts } from "@/db/schemas";

export type Contract = typeof contractTemplates.$inferInsert & {
    location?: Location;
}


export type MemberContract = typeof memberContracts.$inferInsert & {
    member?: Member;
    contract?: Contract;
    subscription?: MemberSubscription | null;
    package?: MemberPackage | null;
    contractTemplate?: Contract;
    location?: Location;
}
