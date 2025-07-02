import { db } from "@/db/db";
import { recurringReservations, reservations } from "@/db/schemas";
import { authenticateMember } from "@/libs/utils";
import { NextResponse, NextRequest } from "next/server";
import { and } from "drizzle-orm";

export async function GET(req: NextRequest, props: { params: Promise<{ lid: string, sid: string }> }) {
    const params = await props.params;
    const authMember = authenticateMember(req);

    try {
        const subscriptions = await db.query.memberSubscriptions.findFirst({
            where: (memberSubscriptions, { eq, and }) => and(
                eq(memberSubscriptions.memberId, authMember.member?.id),
                eq(memberSubscriptions.locationId, params.lid),
                eq(memberSubscriptions.id, params.sid)
            ),
            with: {
                recurrings: {
                    where: (recurrings, { eq }) => eq(recurrings.memberId, authMember.member?.id),
                    with: {
                        session: true,
                        attendances: true
                    }
                },
                plan: {
                    with: {
                        planPrograms: {
                            with: {
                                program: {
                                    with: {
                                        sessions: {
                                            where: (sessions, { eq, or, exists }) => or(
                                                exists(
                                                    db.select()
                                                        .from(reservations)
                                                        .where(and(
                                                            eq(reservations.sessionId, sessions.id),
                                                            eq(reservations.memberId, authMember.member?.id)
                                                        ))
                                                ),
                                                exists(
                                                    db.select()
                                                        .from(recurringReservations)
                                                        .where(and(
                                                            eq(recurringReservations.sessionId, sessions.id),
                                                            eq(recurringReservations.memberId, authMember.member?.id)
                                                        ))
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json(subscriptions, { status: 200 });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}