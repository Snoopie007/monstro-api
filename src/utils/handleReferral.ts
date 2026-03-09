import { db } from "@/db/db";
import { AchievementTriggers } from "@subtrees/constants/data";
import { memberReferrals } from "@subtrees/schemas";
import { triggerIncrement } from "./triggers";
import { broadcastAchievement } from "@/libs/broadcast";


export async function handleReferral(referralCode: string, lid: string, memberId: string) {

    try {
        const referee = await db.query.members.findFirst({
            where: (m, { eq }) => eq(m.referralCode, referralCode),
        })
        if (!referee) {
            throw new Error("Referee not found")
        }
        await db.insert(memberReferrals).values({
            memberId: referee.id,
            referredMemberId: memberId,
            locationId: lid,
            created: new Date(),
        })

        //Trigger Achievement for the 
        const achievement = await triggerIncrement({
            mid: referee.id,
            lid: lid,
            tid: AchievementTriggers.REFERRALS_COUNT,
            amount: 1,
        })

        if (achievement) {
            //loop through the achievements and broadcast them add delay between each broadcast
            for (const a of achievement) {
                await broadcastAchievement(referee.userId, a)
                await new Promise(resolve => setTimeout(resolve, 5000))
            }
        }

    } catch (error) {
        console.error(error)
    }

}