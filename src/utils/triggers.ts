import { db } from '@/db/db'
import {
    memberAchievements,
    memberPointsHistory,
    memberLocations,
} from '@subtrees/schemas'
import type { Achievement, MemberAchievement, NewMemberPointsHistory } from '@subtrees/types'
import { and, eq, inArray, SQL, sql } from 'drizzle-orm'
import { AchievementTriggers } from '@subtrees/constants/data'


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
    tid: number,
    amount: number,
}


/**
 * This function will handle both achievements at once for new member 
 * to reduce the new to run the achievement query twice.
 */
export async function triggerNewMember(data: { planId: string, mid: string, lid: string }) {
    const { planId, mid, lid } = data
    const today = new Date()
    const achievements = await db.query.achievements.findMany({
        where: (a, { and, eq, or, isNull }) => and(
            eq(a.locationId, lid),
            or(
                and(
                    eq(a.triggerId, AchievementTriggers.SIGNUP),
                    isNull(a.planId)
                ),
                and(
                    eq(a.triggerId, AchievementTriggers.PLAN_SIGNUP),
                    eq(a.planId, planId)
                )
            )
        ),
        columns: {
            id: true,
            planId: true,
            points: true,
            triggerId: true,
        },
        with: {
            memberAchievements: {
                where: (ma, { eq }) => eq(ma.memberId, mid),
                columns: {
                    dateAchieved: true,
                }
            }
        }
    })

    if (achievements.length === 0) return

    const commonData = {
        memberId: mid,
        locationId: lid,
    }
    let totalPoints = 0;
    let newMemberAchievementData: MemberAchievement[] = [];
    let pointHistories: NewMemberPointsHistory[] = [];



    achievements.forEach(a => {
        newMemberAchievementData.push({
            ...commonData,
            achievementId: a.id,
            progress: 1,
            dateAchieved: today,
            created: today,
        })
        pointHistories.push({
            ...commonData,
            points: a.points,
            type: 'earned',
            created: today,
            updated: today,
        })
        totalPoints += a.points || 0;
    })

    await db.transaction(async (tx) => {

        await tx.insert(memberAchievements).values(newMemberAchievementData);
        await tx.insert(memberPointsHistory).values(pointHistories);
        await tx.update(memberLocations).set({
            points: sql`${memberLocations.points} + ${totalPoints}`,
            onboarded: true,
            updated: today,
        }).where(
            and(
                eq(memberLocations.memberId, mid),
                eq(memberLocations.locationId, lid)
            )
        )
    })


}

/**
 * This function will handle the sign up achievement for a new member.
 */
export async function triggerPurchase(data: { mid: string, lid: string, pid: string }) {
    const { mid, lid, pid } = data
    const a = await db.query.achievements.findFirst({
        where: (a, { and, eq }) => and(
            eq(a.triggerId, AchievementTriggers.PLAN_SIGNUP),
            eq(a.locationId, lid),
            eq(a.planId, pid)
        ),
        with: {
            memberAchievements: {
                where: (ma, { eq }) => eq(ma.memberId, mid),
                columns: {
                    dateAchieved: true,
                }
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

    return a;
}


export async function triggerFirstBooking(data: { mid: string, lid: string }) {
    const { mid, lid } = data;

    const today = new Date();

    const achievement = await db.query.achievements.findFirst({
        where: (a, { and, eq }) => and(
            eq(a.triggerId, AchievementTriggers.FIRST_BOOKING),
            eq(a.locationId, lid),
        )
    })

    if (!achievement) return

    await db.transaction(async (tx) => {

        await tx.insert(memberAchievements).values({
            memberId: mid,
            locationId: lid,
            achievementId: achievement.id,
            progress: 1,
            dateAchieved: today,
        });
        await tx.insert(memberPointsHistory).values({
            memberId: mid,
            locationId: lid,
            achievementId: achievement.id,
            points: achievement.points,
            type: 'earned',
            created: today,
            updated: today,
        });
        await tx.update(memberLocations).set({
            points: sql`${memberLocations.points} + ${achievement.points}`,
            updated: today,
        }).where(
            and(
                eq(memberLocations.memberId, mid),
                eq(memberLocations.locationId, lid)
            )
        )
    })
    return achievement;
}

export async function triggerIncrement(data: TriggerIncrement) {
    const { mid, lid, tid, amount } = data;


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

    let unlockedAchievements: Achievement[] = [];


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
            if (ma.dateAchieved) {
                unlockedAchievements.push(a);
            };

            const count = (ma.progress || 0) + amount;
            if (count >= a.requiredActionCount) {
                /* Unlock the achievement */
                progressInputs.push({
                    ...CommonData,
                    progress: a.requiredActionCount,
                    dateAchieved: today,
                });
                /* Add the points to the list of point histories */
                pointHistories.push({
                    ...CommonData,
                    points: a.points,
                    type: 'earned',
                });

                /* Add the achievement to the list of unlocked achievements */
                unlockedAchievements.push(a);
            } else {
                /* Add the progress to the list of progress inputs */
                progressInputs.push({
                    ...CommonData,
                    progress: count,
                });
            }
            ids.push(a.id);
        } else {
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
                /* Add the achievement to the list of unlocked achievements */
                unlockedAchievements.push(a);
            } else {
                await db.insert(memberAchievements).values({
                    ...CommonData,
                    progress: amount,
                });
            }
        }
    }

    if (progressInputs.length > 0) {
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
        if (progressInputs.some(i => i.dateAchieved)) {
            updateFields['dateAchieved'] = dateAchievedCase;
        }

        await db.update(memberAchievements).set(updateFields).where(and(
            condition,
            inArray(memberAchievements.achievementId, achievementIds)
        ));
    }

    const totalPoints = pointHistories.reduce((acc, curr) => acc + (curr.points || 0), 0);

    await db.transaction(async (tx) => {
        if (pointHistories.length > 0) {
            await tx.insert(memberPointsHistory).values(pointHistories);
        }
        if (totalPoints > 0) {
            await tx.update(memberLocations).set({
                points: sql`${memberLocations.points} + ${totalPoints}`,
                updated: today,
            }).where(condition);
        }
    });


    if (unlockedAchievements.length > 0) {
        // Broadcast the achievements to the user
        return unlockedAchievements;
    }
}

