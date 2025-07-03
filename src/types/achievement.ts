import { achievements, achievementTriggers, memberAchievements, memberPointsHistory, triggeredAchievements } from "@/db/schemas";
import { Member } from "./member";



export type AchievementTrigger = typeof achievementTriggers.$inferSelect



export type Achievement = typeof achievements.$inferSelect & {
    triggedAchievement?: TriggeredAchievement,
    members?: Member[]
}


export type TriggeredAchievement = typeof triggeredAchievements.$inferSelect & {
    achievement?: Achievement,
    trigger?: AchievementTrigger,
}


export type MemberPointsHistory = typeof memberPointsHistory.$inferSelect & {
    member?: Member,
    location?: Location,
    achievement?: Achievement,
};

export type MemberAchievement = typeof memberAchievements.$inferSelect & {
    member?: Member,
    achievement?: Achievement,
    trigger?: AchievementTrigger,
}