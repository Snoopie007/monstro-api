import { memberRewards, rewards } from "../schemas/rewards";
import type { Location } from "./location";
import type { Member } from "./member";

export type Reward = typeof rewards.$inferSelect & {
    location?: Location
}
export type MemberReward = typeof memberRewards.$inferSelect & {
    reward?: Reward
    member?: Member
    location?: Location
}