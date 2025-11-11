import { db } from '@/db/db'
import {
    memberAchievements,
    memberPointsHistory,
    memberLocations,
} from '@/db/schemas'
import { AchievementTriggers } from '@/libs/data'
import { NewMemberPointsHistory } from '@/types/'
import { and, eq, inArray, SQL, sql } from 'drizzle-orm'

export async function triggerSignUp(data: { mid: string, lid: string, pid: string }) {
    const { mid, lid, pid } = data
    const a = await db.query.achievements.findFirst({
        where: (a, { and, eq }) => and(
            eq(a.triggerId, 3),
            eq(a.locationId, lid),
            eq(a.planId, pid)
        ),
        with: {
            memberAchievements: {
                where: (ma, { eq }) => eq(ma.memberId, mid)
            }
        }
    })

    if (!a) return

    const ma = a?.memberAchievements[0]
    if (ma && ma.dateAchieved) return

    const today = new Date()

    await db.transaction(async (tx) => {
        const CommonData = {
            memberId: mid,
            locationId: lid,
        }
        await tx.insert(memberAchievements).values({
            ...CommonData,
            achievementId: a.id,
            progress: 1,
            dateAchieved: today,
        })
        await tx.insert(memberPointsHistory).values({
            ...CommonData,
            points: a.points,
            type: 'earned',
            created: today,
            updated: today,
        })
        await tx.update(memberLocations).set({
            points: sql`${memberLocations.points} + ${a.points}`,
            updated: today,
        }).where(
            and(
                eq(memberLocations.memberId, mid),
                eq(memberLocations.locationId, lid)
            )
        )
    })
}

type ProgressInput = {
    memberId: string,
    locationId: string,
    achievementId: string,
    progress: number,
    dateAchieved?: Date,
}

type TriggerIncrement = {
    mid: string,
    lid: string,
    type: string,
    amount: number,
}

export async function triggerIncrement(data: TriggerIncrement) {
    const { mid, lid, type, amount } = data;
    const tid = AchievementTriggers.find(t => t.name === type)?.id;
    if (!tid) {
        throw new Error(`Trigger type ${type} not found`);
    }

    const today = new Date();
    const achievements = await db.query.achievements.findMany({
        where: (a, { and, eq }) => and(
            eq(a.triggerId, tid),
            eq(a.locationId, lid),
        ),
        with: {
            memberAchievements: {
                where: (ma, { eq }) => eq(ma.memberId, mid)
            }
        }
    });

    const progressInputs: ProgressInput[] = [];
    const ids: string[] = [];
    const pointHistories: NewMemberPointsHistory[] = [];

    const condition = and(
        eq(memberAchievements.memberId, mid),
        eq(memberAchievements.locationId, lid)
    )

    for (const a of achievements) {
        const ma = a.memberAchievements[0];
        const CommonData = {
            memberId: mid,
            locationId: lid,
            achievementId: a.id,
            created: today,
            updated: today,
        }

        if (ma) {
            // If the member already has an achievement entry, check if it is already achieved.
            // If the achievement is already achieved, continue to the next achievement.
            if (ma.dateAchieved) continue;


            const count = (ma.progress || 0) + amount;
            if (count >= a.requiredActionCount) {
                // Set progress to requiredActionCount, mark achievement as achieved
                progressInputs.push({
                    ...CommonData,
                    progress: a.requiredActionCount,
                    dateAchieved: today,
                });
                pointHistories.push({
                    ...CommonData,
                    points: a.points,
                    type: 'earned',
                });
            } else {
                progressInputs.push({
                    ...CommonData,
                    progress: count,
                });

            }
            ids.push(a.id);
        } else {
            // If the member does not already have an achievement entry, create one.
            // Award points and mark as achieved if the increment reaches or exceeds the required action count.
            if (amount >= a.requiredActionCount) {
                await db.insert(memberAchievements).values({
                    ...CommonData,
                    progress: a.requiredActionCount,
                    dateAchieved: today,
                });
                pointHistories.push({
                    ...CommonData,
                    points: a.points,
                    type: 'earned',
                });
            } else {
                await db.insert(memberAchievements).values({
                    ...CommonData,
                    progress: amount,
                });
            }
        }
    }

    // Bulk update memberAchievements if any updates are needed
    if (progressInputs.length > 0) {
        // Build CASE statement for progress
        const sqlChunks: SQL[] = [];
        const achievementIds: string[] = [];
        sqlChunks.push(sql`(case`);
        for (const input of progressInputs) {
            achievementIds.push(input.achievementId);
            sqlChunks.push(
                sql`when ${memberAchievements.achievementId} = ${input.achievementId} then ${input.progress}`
            );
        }
        sqlChunks.push(sql`end)`);
        const progressCase: SQL = sql.join(sqlChunks, sql.raw(' '));

        // Build CASE statement for dateAchieved
        const dateAchievedChunks: SQL[] = [];
        dateAchievedChunks.push(sql`(case`);
        for (const input of progressInputs) {
            if (input.dateAchieved) {
                dateAchievedChunks.push(
                    sql`when ${memberAchievements.achievementId} = ${input.achievementId} then ${input.dateAchieved}`
                );
            }
        }
        dateAchievedChunks.push(sql`end)`);
        const dateAchievedCase: SQL = sql.join(dateAchievedChunks, sql.raw(' '));

        const updateFields: Record<string, SQL> = {
            progress: progressCase,
        };
        // Only set dateAchieved if at least one had it
        if (progressInputs.some(i => i.dateAchieved)) {
            updateFields['dateAchieved'] = dateAchievedCase;
        }

        await db.update(memberAchievements).set(updateFields).where(and(
            condition,
            inArray(memberAchievements.achievementId, achievementIds)
        ));
    }

    // Award points if any were earned
    const totalPointsEarned = pointHistories.reduce((acc, curr) => acc + (curr.points || 0), 0);

    await db.transaction(async (tx) => {
        if (pointHistories.length > 0) {
            await tx.insert(memberPointsHistory).values(pointHistories);
        }
        if (totalPointsEarned > 0) {
            await tx.update(memberLocations).set({
                points: sql`${memberLocations.points} + ${totalPointsEarned}`,
                updated: today,
            }).where(condition);
        }
    });
}