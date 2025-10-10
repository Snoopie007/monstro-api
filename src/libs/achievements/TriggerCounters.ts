import { db } from "@/db/db";
import { attendances, memberReferrals, memberSubscriptions, reservations } from "@/db/schemas";
import { eq, and, gte, lt, sql } from "drizzle-orm";

export async function countAttendances(
  memberId: string, 
  locationId: string, 
  timePeriod: number | null, 
  timePeriodUnit: 'day' | 'week' | 'month' | 'year' | null
): Promise<number> {
  try {
    let whereConditions = [
      eq(reservations.memberId, memberId),
      eq(reservations.locationId, locationId)
    ];

    // Apply time period filter if specified
    if (timePeriod && timePeriodUnit) {
      const now = new Date();
      let startDate = new Date();
      
      switch (timePeriodUnit) {
        case 'day':
          startDate.setDate(now.getDate() - timePeriod);
          break;
        case 'week':
          startDate.setDate(now.getDate() - (timePeriod * 7));
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - timePeriod);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - timePeriod);
          break;
      }
      
      whereConditions.push(gte(attendances.checkInTime, startDate));
    }

    const query = db.select({ count: sql<number>`count(*)` })
      .from(attendances)
      .innerJoin(reservations, eq(attendances.reservationId, reservations.id))
      .where(and(...whereConditions));

    const result = await query;
    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error counting attendances:', error);
    return 0;
  }
}

export async function countReferrals(
  memberId: string, 
  locationId: string, 
  timePeriod: number | null, 
  timePeriodUnit: 'day' | 'week' | 'month' | 'year' | null
): Promise<number> {
  try {
    let whereConditions = [
      eq(memberReferrals.memberId, memberId),
      eq(memberReferrals.locationId, locationId)
    ];

    // Apply time period filter if specified
    if (timePeriod && timePeriodUnit) {
      const now = new Date();
      let startDate = new Date();
      
      switch (timePeriodUnit) {
        case 'day':
          startDate.setDate(now.getDate() - timePeriod);
          break;
        case 'week':
          startDate.setDate(now.getDate() - (timePeriod * 7));
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - timePeriod);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - timePeriod);
          break;
      }
      
      whereConditions.push(gte(memberReferrals.created, startDate));
    }

    const query = db.select({ count: sql<number>`count(*)` })
      .from(memberReferrals)
      .where(and(...whereConditions));

    const result = await query;
    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error counting referrals:', error);
    return 0;
  }
}

export async function checkPlanSignup(
  memberId: string, 
  locationId: string, 
  requiredPlanId?: string
): Promise<number> {
  try {
    let whereConditions = [
      eq(memberSubscriptions.memberId, memberId),
      eq(memberSubscriptions.locationId, locationId),
      eq(memberSubscriptions.status, 'active')
    ];

    // If a specific plan is required, filter by it
    if (requiredPlanId) {
      whereConditions.push(eq(memberSubscriptions.memberPlanId, requiredPlanId));
    }

    const query = db.select({ count: sql<number>`count(*)` })
      .from(memberSubscriptions)
      .where(and(...whereConditions));

    const result = await query;
    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error checking plan signup:', error);
    return 0;
  }
}