import { db } from "@/db/db";
import { reservations } from "@subtrees/schemas";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { startOfWeek, endOfWeek, sub } from "date-fns";
import type { MemberPackage } from "@subtrees/types";


type CheckClassLimitProps = {
    pkg?: Partial<MemberPackage>;
    sub?: {
        id?: string;
        memberId?: string;
        classCredits?: number;
        pricing?: {
            plan?: {
                classLimitInterval?: string | null;
                totalClassLimit?: number | null
            }
        }
    };
    now: Date;
}

export async function checkClassLimit(props: CheckClassLimitProps): Promise<boolean> {
    const { sub, pkg, now } = props;
    if (pkg && pkg.totalClassAttended && pkg.totalClassLimit) {
        if (pkg.totalClassAttended >= pkg.totalClassLimit) {
            return true;
        }
        return false;
    }

    if (sub) {
        const plan = sub.pricing?.plan;
        if (plan?.classLimitInterval === "week" && plan?.totalClassLimit) {
            const [res] = await db.select({ count: sql<number>`count(*)` })
                .from(reservations)
                .where(and(
                    eq(reservations.memberId, sub.memberId!),
                    gte(reservations.startOn, startOfWeek(now)),
                    lte(reservations.startOn, endOfWeek(now)),
                    eq(reservations.memberSubscriptionId, sub.id!)
                ));
            if ((res?.count ?? 0) >= plan.totalClassLimit) {
                return true;
            }
        } else if (sub.classCredits === 0) {
            return true;
        }
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
    programId: string;
    memberId: string;
}

export async function getSessionState(props: GetSessionStateProps): Promise<SessionState> {
    const { startTime, sessionId, programId, memberId } = props;

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

    const program = await db.query.programs.findFirst({
        where: (programs, { eq }) => eq(programs.id, programId),
        columns: {
            capacity: true,
        },
    });
    const availability = (program?.capacity ?? 0) - reservationsCount;

    const isReserved = reservations.some(r => r.memberId === memberId);

    const isFull = availability <= 0;

    return { isFull, isReserved };
}

