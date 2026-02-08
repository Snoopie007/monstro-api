import { db } from "@/db/db";
import { attendances } from "@subtrees/schemas";
import { eq, or } from "drizzle-orm";

/**
 * Check if a missed class email should be sent
 * Returns false if member attended the class (attendance exists)
 * Returns true if member missed the class (no attendance)
 */
export async function shouldSendMissedClassEmail(metadata: any): Promise<boolean> {
    try {
        const reservationId = metadata?.session?.reservationId;
        const recurringId = metadata?.session?.recurringId;

        if (!reservationId && !recurringId) {
            console.warn('⚠️ Missing reservationId or recurringId in missed class email metadata');
            return false; // Don't send if we can't verify
        }

        // Check if attendance record exists for this reservation
        const attendance = await db.query.attendances.findFirst({
            where: or(
                reservationId ? eq(attendances.reservationId, reservationId) : undefined,
                recurringId ? eq(attendances.recurringId, recurringId) : undefined
            )
        });

        if (attendance) {
            console.log(`✅ Member attended - skipping missed class email for reservation ${reservationId || recurringId}`);
            return false; // Member attended, don't send missed class email
        }

        console.log(`📧 No attendance found - sending missed class email for reservation ${reservationId || recurringId}`);
        return true; // No attendance found, send the missed class email
    } catch (error) {
        console.error('Error checking attendance for missed class email:', error);
        // In case of error, default to not sending to avoid unwanted emails
        return false;
    }
}

