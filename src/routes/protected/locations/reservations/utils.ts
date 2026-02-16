import { db } from "@/db/db";
import { reservations } from "@subtrees/schemas";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { startOfWeek, endOfWeek, subDays, addMinutes, differenceInMilliseconds, addWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { classQueue } from "@/queues";


type CheckSubClassCreditsProps = {
    sid: string;
    mid: string | undefined;
    classLimitInterval: "week" | "term" | "one" | null;
    totalClassLimit: number | null;
}

export async function checkSubClassCredits(props: CheckSubClassCreditsProps): Promise<boolean> {
    const { sid, mid, classLimitInterval, totalClassLimit } = props;
    if (!classLimitInterval || !totalClassLimit || !mid) {
        return false;
    }
    const now = new Date();
    if (classLimitInterval === "week") {
        const [res] = await db.select({ count: sql<number>`count(*)` })
            .from(reservations)
            .where(and(
                eq(reservations.memberId, mid),
                gte(reservations.startOn, startOfWeek(now)),
                lte(reservations.startOn, endOfWeek(now)),
                eq(reservations.memberSubscriptionId, sid)
            ));
        if ((res?.count ?? 0) >= totalClassLimit) {
            return true;
        }

        return false;
    }
    return false;
}



type SessionState = {
    isFull: boolean;
    isReserved: boolean;

}

type GetSessionStateProps = {
    startTime: Date;
    sessionId: string;
    memberId: string;
    capacity: number;
}

export async function getSessionState(props: GetSessionStateProps): Promise<SessionState> {
    const { startTime, sessionId, capacity, memberId } = props;

    const reservations = await db.query.reservations.findMany({
        where: (reservations, { eq, and }) => and(
            eq(reservations.sessionId, sessionId),
            eq(reservations.startOn, startTime),
        ),
        columns: {
            id: true,
            memberId: true,
        },
    });


    const reservationsCount = reservations.length;


    const availability = (capacity ?? 0) - reservationsCount;

    const isReserved = reservations.some(r => r.memberId === memberId);

    const isFull = availability <= 0;

    return { isFull, isReserved };
}


type ScheduleClassReminderJobsProps = {
    lid: string;
    reservationId: string;
    memberPlanId: string;
    member: {
        id: string;
        firstName: string;
        lastName: string | null;
        email: string;
    };
    location: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        timezone: string;
    };
    session: {
        id: string;
        programName: string;
        utcStartTime: Date;
        utcEndTime: Date;
    };
    plan: {
        id: string;
        classLimitInterval: "week" | "term" | "one" | null;
        totalClassLimit: number | null;
    };
    autoReschedule: boolean;
};


export async function scheduleClassReminderJobs(props: ScheduleClassReminderJobsProps) {
    const { lid, reservationId, memberPlanId, member, location, session, plan, autoReschedule } = props;
    const now = toZonedTime(new Date(), location.timezone);
    try {

        const payload = {
            rid: reservationId,
            lid,
            member: {
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.email,
            },
            location: {
                name: location.name,
                email: location.email,
                phone: location.phone,
            },
            class: {
                name: session.programName,
                startTime: session.utcStartTime,
                endTime: session.utcEndTime,
            },
        }
        // Calculate delays for reminders and missed checks

        const reminderDelay = differenceInMilliseconds(subDays(session.utcStartTime, 2), now);
        const missedDelay = differenceInMilliseconds(addMinutes(session.utcEndTime, 45), now);
        let queues = [
            classQueue.add('reminder', payload, {
                jobId: `class:reminder:${reservationId}`,
                attempts: 2,
                delay: reminderDelay,
            }),

            classQueue.add('missed:check', {
                ...payload,
                mid: member.id,
            }, {
                jobId: `class:missed:${reservationId}`,
                attempts: 2,
                delay: missedDelay,
            })
        ]

        if (autoReschedule) {
            const nextUtcStartTime = addWeeks(session.utcStartTime, 1);
            const nextUtcEndTime = addWeeks(session.utcEndTime, 1);
            const rescheduleDelay = differenceInMilliseconds(subDays(nextUtcStartTime, 2), now);
            queues.push(
                classQueue.add('auto:reschedule', {
                    lid,
                    memberPlanId: memberPlanId,
                    location: {
                        ...payload.location,
                        timezone: location.timezone,
                    },
                    member: payload.member,
                    session: {
                        ...session,
                        utcStartTime: nextUtcStartTime,
                        utcEndTime: nextUtcEndTime,
                    },
                    plan,
                }, {
                    jobId: `class:reschedule:${reservationId}`,
                    attempts: 3,
                    delay: rescheduleDelay,
                })
            )
        }
        await Promise.all(queues)

    } catch (error) {
        console.error('Error scheduling class reminder jobs:', error);
        // Don't fail the reservation if job scheduling fails
    }


}