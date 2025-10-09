import { db } from "@/db/db";
import { achievements, achievementTriggers, memberAchievements, memberPointsHistory, triggeredAchievements } from "@/db/schemas";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { checkPlanSignup, countAttendances, countReferrals } from "./TriggerCounters";

export interface TriggerEvaluation {
  memberId: string;
  locationId: string;
  triggerType: 'attendances_count' | 'referrals_count' | 'plan_signup';
  data?: any;
}

export async function evaluateTriggers({ memberId, locationId, triggerType, data }: TriggerEvaluation) {
  const triggerMap = {
    'attendances_count': 2, 
    'referrals_count': 3,
    'plan_signup': 4
  };

  try {
    const triggers = await db.query.triggeredAchievements.findMany({
      where: eq(triggeredAchievements.triggerId, triggerMap[triggerType]),
      with: {
        achievement: true
      }
    });

    for (const trigger of triggers) {
      // Only process triggers for the correct location
      if (trigger.achievement.locationId !== locationId) {
        continue;
      }

      let count = 0;
      
      switch (triggerType) {
        case 'attendances_count':
          count = await countAttendances(memberId, locationId, trigger.timePeriod, trigger.timePeriodUnit);
          break;
        case 'referrals_count':
          count = await countReferrals(memberId, locationId, trigger.timePeriod, trigger.timePeriodUnit);
          break;
        case 'plan_signup':
          count = await checkPlanSignup(memberId, locationId, trigger.memberPlanId);
          break;
      }
      
      await updateMemberAchievement(memberId, trigger.achievementId, locationId, count);
      
      if (count >= trigger.achievement.requiredActionCount) {
        await awardAchievement(memberId, trigger.achievementId, locationId, trigger.achievement.points);
      }
    }
  } catch (error) {
    console.error('Error evaluating triggers:', error);
    throw error;
  }
}

async function updateMemberAchievement(memberId: string, achievementId: string, locationId: string, progress: number) {
  const existing = await db.query.memberAchievements.findFirst({
    where: and(
      eq(memberAchievements.memberId, memberId),
      eq(memberAchievements.achievementId, achievementId)
    )
  });

  if (existing) {
    await db.update(memberAchievements)
      .set({ 
        progress,
        dateAchieved: new Date()
      })
      .where(and(
        eq(memberAchievements.memberId, memberId),
        eq(memberAchievements.achievementId, achievementId)
      ));
  } else {
    await db.insert(memberAchievements).values({
      memberId,
      achievementId,
      locationId,
      progress,
      created: new Date(),
      dateAchieved: new Date()
    });
  }
}

async function awardAchievement(memberId: string, achievementId: string, locationId: string, points: number) {
  const existing = await db.query.memberAchievements.findFirst({
    where: and(
      eq(memberAchievements.memberId, memberId),
      eq(memberAchievements.achievementId, achievementId)
    )
  });

  if (existing && existing.dateAchieved) {
    return; // Already awarded
  }

  // Update achievement as completed
  await db.update(memberAchievements)
    .set({ 
      dateAchieved: new Date()
    })
    .where(and(
      eq(memberAchievements.memberId, memberId),
      eq(memberAchievements.achievementId, achievementId)
    ));

  // Award points
  await awardPoints(memberId, locationId, points, achievementId);
}

async function awardPoints(memberId: string, locationId: string, points: number, achievementId?: string) {
  await db.insert(memberPointsHistory).values({
    locationId,
    memberId,
    points,
    achievementId,
    type: 'earned',
    created: new Date(),
    updated: new Date()
  });
}