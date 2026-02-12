import { achievements, memberAchievements, memberPointsHistory } from "../schemas";
import type { Member } from "./member";
import type { Location } from "./location";


export type Achievement = typeof achievements.$inferSelect & {
    members?: Member[]
}

export type AchievementTrigger = {
    id: number,
    name: string
}

export type MemberPointsHistory = typeof memberPointsHistory.$inferSelect & {
    member?: Member,
    location?: Location,
    achievement?: Achievement,
};
export type NewMemberPointsHistory = typeof memberPointsHistory.$inferInsert;
export type MemberAchievement = typeof memberAchievements.$inferSelect & {
    member?: Member,
    location?: Location,
    achievement?: Achievement,
}