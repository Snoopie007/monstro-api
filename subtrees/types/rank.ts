import {
	memberRankRequirements,
	memberRanks,
	rankProcesses,
	rankRequirements,
	ranks,
} from "../schemas/rank";
import type { Location } from "./location";
import type { Member } from "./member";
import type { Staff } from "./staff";

export type RankProcess = typeof rankProcesses.$inferSelect & {
	location?: Location;
	ranks?: Rank[];
};

export type Rank = typeof ranks.$inferSelect & {
	process?: RankProcess;
	requirements?: RankRequirement[];
};

export type RankRequirement = typeof rankRequirements.$inferSelect & {
	rank?: Rank;
};

export type MemberRankRequirement = typeof memberRankRequirements.$inferSelect & {
	member?: Member;
	location?: Location;
	requirement?: RankRequirement;
	verifier?: Staff;
};

export type MemberRank = typeof memberRanks.$inferSelect & {
	member?: Member;
	location?: Location;
	process?: RankProcess;
	rank?: Rank;
};
