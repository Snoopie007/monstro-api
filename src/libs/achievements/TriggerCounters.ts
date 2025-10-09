import { db } from "@/db/db";
import { attendances, memberReferrals, memberSubscriptions, reservations, recurringReservations } from "@/db/schemas";
import { eq, and, gte, lt, sql, or } from "drizzle-orm";

export async function countAttendances(
  memberId: string, 
  locationId: string, 
  timePeriod: number | null, 
  timePeriodUnit: 'day' | 'week' | 'month' | 'year' | null
): Promise<number> {
  try {
    const conditions = [
      or(
        eq(reservations.memberId, memberId),
        eq(recurringReservations.memberId, memberId)
      ),
      or(
        eq(reservations.locationId, locationId),
        eq(recurringReservations.locationId, locationId)
      )
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
      
      conditions.push(gte(attendances.created, startDate));
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendances)
      .leftJoin(reservations, eq(attendances.reservationId, reservations.id))
      .leftJoin(recurringReservations, eq(attendances.recurringId, recurringReservations.id))
      .where(and(...conditions));

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
    const conditions = [
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
      
      conditions.push(gte(memberReferrals.created, startDate));
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(memberReferrals)
      .where(and(...conditions));

    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error counting referrals:', error);
    return 0;
  }
}

export async function checkPlanSignup(
  memberId: string, 
  locationId: string, 
  requiredPlanId: string | null
): Promise<number> {
  try {
    const conditions = [
      eq(memberSubscriptions.memberId, memberId),
      eq(memberSubscriptions.locationId, locationId),
      eq(memberSubscriptions.status, 'active')
    ];

    // If a specific plan is required, filter by it
    if (requiredPlanId) {
      conditions.push(eq(memberSubscriptions.memberPlanId, requiredPlanId));
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(memberSubscriptions)
      .where(and(...conditions));

    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error checking plan signup:', error);
    return 0;
  }
}