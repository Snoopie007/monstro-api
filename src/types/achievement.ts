import { achievements, achievementTriggers } from "@/db/schemas";
import { Member } from "./member";



export type Trigger = typeof achievementTriggers.$inferSelect & {
    achievement: Achievement
}

export type Achievement = typeof achievements.$inferSelect & {
    triggers?: Trigger[],
    members?: Member[]
}