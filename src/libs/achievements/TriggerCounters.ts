import { db } from "@/db/db";
import { attendances, memberReferrals, memberSubscriptions, reservations } from "@/db/schemas";
import { eq, and, gte, lt, sql } from "drizzle-orm";

export async function countAttendances(
  memberId: string,
  locationId: string,
): Promise<number> {
  try {
    let whereConditions = [
      eq(reservations.memberId, memberId),
      eq(reservations.locationId, locationId)
    ];



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
): Promise<number> {
  try {
    let whereConditions = [
      eq(memberReferrals.memberId, memberId),
      eq(memberReferrals.locationId, locationId)
    ];



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
  planId: string
): Promise<number> {
  try {
    let whereConditions = [
      eq(memberSubscriptions.memberId, memberId),
      eq(memberSubscriptions.locationId, locationId),
      eq(memberSubscriptions.status, 'active'),
      eq(memberSubscriptions.memberPlanId, planId)
    ];

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