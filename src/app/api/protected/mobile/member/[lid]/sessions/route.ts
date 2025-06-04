import { db } from "@/db/db";
import { authenticateMember } from "@/libs/utils";
import { NextResponse, NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { programSessions, reservations } from "@/db/schemas";

export async function GET(req: NextRequest, props: { params: Promise<{ lid: number }> }) {
    try {
        const params = await props.params;
        const authMember = authenticateMember(req);

        if (!authMember.member.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const memberId = authMember.member.id;

        const allPlans = await db.query.memberPlans.findMany({
            where: (p, { eq }) => eq(p.locationId, Number(params.lid)),
            with: {
                planPrograms: {
                    with: {
                        program: {
                            with: {
                                sessions: {
                                    with: {
                                        reservations: {
                                            where: (r, { eq }) => eq(r.memberId, memberId)
                                        }
                                    }

                                }
                            }
                        }
                    }
                },

            }
        });

        const transformedPlans = allPlans.map(plan => ({
            ...plan,
            planPrograms: plan.planPrograms.map(planProgram => ({
                ...planProgram,
                program: {
                    ...planProgram.program,
                    sessions: planProgram.program.sessions.map(session => ({
                        ...session,
                        reservations: session.reservations,
                        isReserved: session.reservations.length > 0
                    }))
                }
            }))
        }));

        return NextResponse.json({
            plans: transformedPlans
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}