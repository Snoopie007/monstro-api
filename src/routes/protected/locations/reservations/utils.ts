import { db } from "@/db/db";
import type { MemberPackage, MemberSubscription, ProgramSession } from "@/types";
import { startOfWeek, endOfWeek } from "date-fns";
import { sql } from "drizzle-orm";
import { reservations } from "@/db/schemas";
import { and, eq, gte, lte } from "drizzle-orm";

export async function getMemberPlan(memberPlanId: string): Promise<MemberPackage | MemberSubscription> {
    const isPackage = memberPlanId.startsWith("pkg_");
    let memberPlan: MemberPackage | MemberSubscription | undefined;
    if (isPackage) {
        memberPlan = await db.query.memberPackages.findFirst({
            where: (memberPackages, { eq, and }) => and(
                eq(memberPackages.id, memberPlanId),
                eq(memberPackages.status, "active")
            ),
            with: {
                location: {
                    with: {
                        locationState: true,
                    },
                },
                pricing: {
                    with: {
                        plan: true,
                    },
                },
            },
        });
    } else {
        memberPlan = await db.query.memberSubscriptions.findFirst({
            where: (memberSubscriptions, { eq, and }) => and(
                eq(memberSubscriptions.id, memberPlanId),
                eq(memberSubscriptions.status, "active")
            ),
            with: {
                location: {
                    with: {
                        locationState: true,
                    },
                },
                pricing: {
                    with: {
                        plan: true,
                    },
                },
            },
        });
    }
    if (!memberPlan) {
        throw new Error("Member plan not found");
    }

    if (memberPlan.status !== "active") {
        throw new Error("Member plan is not active");
    }
    return memberPlan;
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
    const recurringReservations = await db.query.recurringReservations.findMany({
        where: (recurringReservations, { eq, and, lte, isNull }) => and(
            eq(recurringReservations.sessionId, sessionId),
            lte(recurringReservations.startDate, startTime),
            isNull(recurringReservations.canceledOn),
        ),
        with: {
            exceptions: true,
        },
        columns: {
            id: true,
            memberId: true,
        },
    });

    const reservationsCount = reservations.length;

    let recurringReservationsCount = 0;
    if (recurringReservations && recurringReservations.length > 0) {
        recurringReservationsCount = recurringReservations.filter(rr => rr.exceptions?.length === 0).length;
    }

    const program = await db.query.programs.findFirst({
        where: (programs, { eq }) => eq(programs.id, programId),
        columns: {
            capacity: true,
        },
    });
    const availability = (program?.capacity ?? 0) - (reservationsCount + recurringReservationsCount);

    const hasReservations = reservations.some(r => r.memberId === memberId);
    const hasRecurringReservations = recurringReservations.some(rr => rr.memberId === memberId);

    const isReserved = hasReservations || hasRecurringReservations;

    const isFull = availability <= 0;

    return { isFull, isReserved };
}


type CheckClassLimitProps = {
    isPackage: boolean;
    memberPlan: MemberPackage | MemberSubscription;
    now: Date;
}
export async function checkClassLimit(props: CheckClassLimitProps) {
    const { isPackage, memberPlan, now } = props;

    if (isPackage) {
        const pkg = memberPlan as MemberPackage;
        if (pkg.totalClassAttended >= pkg.totalClassLimit) {
            return true;
        }
        return false;
    } else {
        const sub = memberPlan as MemberSubscription;
        const plan = sub.pricing?.plan;
        if (plan?.classLimitInterval === "week" && plan?.totalClassLimit) {
            const startOfWeekDate = startOfWeek(now);
            const endOfWeekDate = endOfWeek(now);
            const perfBeforeCounts = performance.now();
            const [res] = await db.select({ count: sql<number>`count(*)` })
                .from(reservations).where(and(
                    eq(reservations.memberId, memberPlan.memberId),
                    gte(reservations.startOn, startOfWeekDate),
                    lte(reservations.startOn, endOfWeekDate),
                    eq(reservations.memberSubscriptionId, sub.id)
                ));


            const reservationCount = res?.count || 0;

            const perfAfterResCount = performance.now();

            console.log('reservationCount', reservationCount);
            console.log('PERF Check Class Limit: ', perfAfterResCount - perfBeforeCounts);
            if (reservationCount >= plan?.totalClassLimit) {
                return true;
            }
            return false;
        } else {
            if (sub.classCredits === 0) {
                return true;
            }
            return false;
        }
    }
}