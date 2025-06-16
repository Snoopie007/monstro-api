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

        // const allPlans = await db.query.memberPlans.findMany({
        //     where: (p, { eq }) => eq(p.locationId, Number(params.lid)),
        //     with: {
        //         planPrograms: {
        //             with: {
        //                 program: {
        //                     with: {
        //                         sessions: {
        //                             with: {
        //                                 reservations: {
        //                                     where: (r, { eq }) => eq(r.memberId, memberId)
        //                                 }
        //                             }

        //                         }
        //                     }
        //                 }
        //             }
        //         },

        //     }
        // });

        // const transformedPlans = allPlans.map(plan => ({
        //     ...plan,
        //     planPrograms: plan.planPrograms.map(planProgram => ({
        //         ...planProgram,
        //         program: {
        //             ...planProgram.program,
        //             sessions: planProgram.program.sessions.map(session => ({
        //                 ...session,
        //                 reservations: session.reservations,
        //                 isReserved: session.reservations.length > 0
        //             }))
        //         }
        //     }))
        // }));


        const subscriptions = await db.query.memberSubscriptions.findMany({
                    where: (memberSubscriptions, { eq, and }) => and(
                        eq(memberSubscriptions.memberId, Number(authMember.member?.id)),
                        eq(memberSubscriptions.locationId, params.lid),
                        eq(memberSubscriptions.status, 'active')
                    ),
                    with: {
                        plan: {
                            with: {
                                planPrograms: {
                                    with: {
                                        program: {
                                            with: {
                                                sessions: true,
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    }
                });

                const packages = await db.query.memberPackages.findMany({
                    where: (memberPackages, { eq, and }) => and(
                        eq(memberPackages.memberId, Number(authMember.member?.id)),
                        eq(memberPackages.locationId, params.lid),
                        eq(memberPackages.status, 'active')
                    ),
                    with: {
                        plan: {
                            with: {
                                planPrograms: {
                                    with: {
                                        program: {
                                            with: {
                                                sessions: true,
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    }
                });

                const transformedPlans = [...subscriptions, ...packages].map(plan => ({
                    ...plan,
                    planPrograms: plan.plan.planPrograms.map(planProgram => ({
                        ...planProgram,
                        program: {
                            ...planProgram.program,
                            sessions: planProgram.program.sessions.map(session => ({
                                ...session,
                                reservations: [], // Placeholder, will populate below
                                isReserved: false // Placeholder, will populate below
                            }))
                        }
                    }))
                }));




            
        return NextResponse.json({ subscriptions: [...subscriptions, ...packages] }, { status: 200 });    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}