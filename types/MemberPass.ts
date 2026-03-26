import { memberPasses } from "../schemas/MemberPasses";
import { Location } from "./location";
import { Member, MemberPlan } from "./member";

export type MemberPass = typeof memberPasses.$inferSelect & {
    referrer: Member;
    location: Location;
    claimedByMember: Member;
    plan: MemberPlan;
}