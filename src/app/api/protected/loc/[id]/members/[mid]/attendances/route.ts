import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/db'
import { ExtendedAttendance } from '@/types/attendance'

/**
 * Retrieves attendance records for a specific member at a location,
 * enriched with program and level information from both subscriptions and packages.
 */
export async function GET(
    req: NextRequest,
    props: { params: Promise<{ mid: string; id: string }> }
) {
    const params = await props.params

    try {
        const [subs, pkgs] = await Promise.all([
            db.query.memberSubscriptions.findMany({
                where: (memberSubscriptions, { eq, and }) =>
                    and(
                        eq(memberSubscriptions.memberId, params.mid),
                        eq(memberSubscriptions.locationId, params.id)
                    ),
                with: {
                    recurrings: {
                        with: {
                            session: {
                                with: {
                                    program: true,
                                },
                            },
                            attendances: true,
                        },
                    },
                    reservations: {
                        with: {
                            session: {
                                with: {
                                    program: true,
                                },
                            },
                            attendances: true,
                        },
                    },
                },
            }),
            db.query.memberPackages.findMany({
                where: (memberPackages, { eq, and }) =>
                    and(
                        eq(memberPackages.memberId, params.mid),
                        eq(memberPackages.locationId, params.id)
                    ),
                with: {
                    recurrings: {
                        with: {
                            session: {
                                with: {
                                    program: true,
                                },
                            },
                            attendances: true,
                        },
                    },
                    reservations: {
                        with: {
                            session: {
                                with: {
                                    program: true,
                                },
                            },
                            attendances: true,
                        },
                    },
                },
            }),
        ])

        const attendances: ExtendedAttendance[] = []
        const memberPlans = [...(subs || []), ...(pkgs || [])]

        memberPlans.forEach((plan) => {
            if (plan.reservations && plan.reservations.length > 0) {
                plan.reservations.forEach((reservation) => {
                    if (
                        !reservation.attendances ||
                        reservation.attendances.length === 0
                    )
                        return
                    reservation.attendances.forEach((attendance) => {
                        attendances.push({
                            ...attendance,
                            programName: reservation.session.program.name,
                            created: attendance.created ?? new Date(),
                        })
                    })
                })
            }

            if (plan.recurrings && plan.recurrings.length > 0) {
                plan.recurrings.forEach((recurring) => {
                    if (!recurring.attendances) return
                    recurring.attendances.forEach((attendance) => {
                        attendances.push({
                            ...attendance,
                            programName: recurring.session.program.name,
                            created: attendance.created ?? new Date(),
                        })
                    })
                })
            }
        })

        return NextResponse.json(attendances, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
