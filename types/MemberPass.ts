import { memberPasses } from "../schemas/MemberPasses";
import type { Location } from "./location";
import type { Member, MemberPlan } from "./member";
export type MemberPass = typeof memberPasses.$inferSelect & {
    referrer: Member;
    location: Location;
    claimedByMember: Member;
    plan: MemberPlan;
}