import {
	memberRankHistory,
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
	location?: Location;
	process?: RankProcess;
	requirements?: RankRequirement[];
};

export type RankRequirement = typeof rankRequirements.$inferSelect & {
	rank?: Rank;
};

export type MemberRank = typeof memberRanks.$inferSelect & {
	member?: Member;
	location?: Location;
	process?: RankProcess;
	rank?: Rank;
	history?: MemberRankHistory[];
};

export type MemberRankHistory = typeof memberRankHistory.$inferSelect & {
	member?: Member;
	location?: Location;
	process?: RankProcess;
	rank?: Rank;
	promoter?: Staff;
};

export type MemberRankRequirement = typeof memberRankRequirements.$inferSelect & {
	member?: Member;
	location?: Location;
	requirement?: RankRequirement;
	verifier?: Staff;
};

export type NewRankProcess = typeof rankProcesses.$inferInsert;
export type NewRank = typeof ranks.$inferInsert;
export type NewRankRequirement = typeof rankRequirements.$inferInsert;
export type NewMemberRank = typeof memberRanks.$inferInsert;
export type NewMemberRankHistory = typeof memberRankHistory.$inferInsert;
export type NewMemberRankRequirement = typeof memberRankRequirements.$inferInsert;
