import { rewards } from "@subtrees/schemas";
import { Location } from "../location";
import { memberRewards } from "@subtrees/schemas";
import { Member } from "../member";
export type Reward = typeof rewards.$inferSelect & {
	location?: Location;
}

export type RewardInsert = typeof rewards.$inferInsert

export type MemberReward = typeof memberRewards.$inferSelect & {
	member?: Member,
	location?: Location,
	reward?: Reward,
} 
