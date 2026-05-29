import { contractTemplates, memberContracts } from "../schemas";
import type { Location } from "./location";
import type { Member, MemberPackage, MemberSubscription } from "./member";

export type Contract = typeof contractTemplates.$inferSelect & {
    location?: Location;
    planName?: string;
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
