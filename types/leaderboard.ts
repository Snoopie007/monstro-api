import type { Member } from "./member";

export type LeaderboardMember = Member & {
    points?: number;
    referrals?: number;
}
