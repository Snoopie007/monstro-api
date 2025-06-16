import { db } from "@/db/db";
import { recurringReservations, reservations } from "@/db/schemas";
import { authenticateMember } from "@/libs/utils";
import { NextResponse, NextRequest } from "next/server";
import { and } from "drizzle-orm";

export async function GET(req: NextRequest, props: { params: Promise<{ lid: number, sid: number }> }) {

    const params =await props.params;
    const authMember = authenticateMember(req);

    try {
        const Packages = await db.query.memberPackages.findFirst({
            where: (memberPackages, { eq, and }) => and(
                eq(memberPackages.memberId, Number(authMember.member?.id)),
                eq(memberPackages.locationId, params.lid),
                eq(memberPackages.id, params.sid)
            ),
            with: {
                reservations: {
                    where: (reservations, { eq }) => eq(reservations.memberId, Number(authMember.member?.id)),
                    with: {
                        session: true
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
                                                            eq(reservations.memberId, Number(authMember.member?.id))
                                                        ))
                                                ),
                                                exists(
                                                    db.select()
                                                        .from(recurringReservations)
                                                        .where(and(
                                                            eq(recurringReservations.sessionId, sessions.id),
                                                            eq(recurringReservations.memberId, Number(authMember.member?.id))
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

        return NextResponse.json(Packages, { status: 200 });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}