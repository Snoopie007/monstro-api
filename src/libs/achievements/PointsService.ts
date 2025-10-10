import { db } from "@/db/db";
import { memberPointsHistory } from "@/db/schemas";
import { eq, and, sql, desc } from "drizzle-orm";

export async function getMemberTotalPoints(memberId: string, locationId: string): Promise<number> {
  try {
    const result = await db
      .select({ 
        total: sql<number>`sum(CASE WHEN removed = false THEN points ELSE 0 END)` 
      })
      .from(memberPointsHistory)
      .where(and(
        eq(memberPointsHistory.memberId, memberId),
        eq(memberPointsHistory.locationId, locationId)
      ));

    return result[0]?.total || 0;
  } catch (error) {
    console.error('Error getting member total points:', error);
    return 0;
  }
}

export async function getMemberPointsHistory(memberId: string, locationId: string, limit = 50) {
  try {
    return await db.query.memberPointsHistory.findMany({
      where: and(
        eq(memberPointsHistory.memberId, memberId),
        eq(memberPointsHistory.locationId, locationId)
      ),
      orderBy: [desc(memberPointsHistory.createdAt)],
      limit
    });
  } catch (error) {
    console.error('Error getting member points history:', error);
    return [];
  }
}

export async function deductPoints(
  memberId: string, 
  locationId: string, 
  points: number, 
  reason: string
): Promise<boolean> {
  try {
    const currentPoints = await getMemberTotalPoints(memberId, locationId);
    
    if (currentPoints < points) {
      return false; // Insufficient points
    }

    await db.insert(memberPointsHistory).values({
      locationId,
      memberId,
      points: -points, // Negative for deduction
      type: 'spent',
      removed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error deducting points:', error);
    return false;
  }
}

export async function addPoints(
  memberId: string, 
  locationId: string, 
  points: number, 
  type: string = 'bonus',
  achievementId?: string
): Promise<boolean> {
  try {
    await db.insert(memberPointsHistory).values({
      locationId,
      memberId,
      points,
      type,
      achievementId,
      removed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error adding points:', error);
    return false;
  }
}