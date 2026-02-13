import { memberRewards, rewards } from "../schemas/rewards";
import { Location } from "./location";
import { Member } from "./member";

export type Reward = typeof rewards.$inferSelect & {
    location?: Location
}
export type MemberReward = typeof memberRewards.$inferSelect & {
    reward?: Reward
    member?: Member
    location?: Location
}