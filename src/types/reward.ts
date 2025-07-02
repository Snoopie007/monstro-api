import { rewards } from "@/db/schemas";
import { Location } from "./location";

export type Reward = typeof rewards.$inferSelect & {
	location?: Location;
}

export type RewardInsert = typeof rewards.$inferInsert 