import { db } from "@/db/db";
import { reservations } from "@subtrees/schemas";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { startOfWeek, endOfWeek, sub } from "date-fns";


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

