import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { ExtendedAttendance } from '@/types/attendance';

/**
 * Retrieves attendance records for a specific member at a location,
 * enriched with program and level information from both subscriptions and packages.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ mid: number, id: number }> }) {

    const params = await props.params;

    try {
        const [subs, pkgs] = await Promise.all([
            db.query.memberSubscriptions.findMany({
                where: (memberSubscriptions, { eq, and }) => and(
                    eq(memberSubscriptions.memberId, params.mid),
                    eq(memberSubscriptions.locationId, params.id)
                ),
                with: {
                    program: {
                        columns: {
                            name: true
                        }
                    },
                    reservations: {
                        with: {
                            attendances: true
                        }
                    }
                }
            }),
            db.query.memberPackages.findMany({
                where: (memberPackages, { eq, and }) => and(
                    eq(memberPackages.memberId, params.mid),
                    eq(memberPackages.locationId, params.id)
                ),
                with: {
                    program: {
                        columns: {
                            name: true
                        }
                    },
                    reservations: {
                        with: {
                            attendances: true
                        }
                    }
                }
            })
        ]);

        const attendances: ExtendedAttendance[] = [];
        const memberPlans = [...(subs || []), ...(pkgs || [])];

        memberPlans.forEach(plan => {
            if (!plan.reservations?.length) return;

            const programName = plan.program.name;

            plan.reservations.forEach(reservation => {
                if (!reservation.attendances?.length) return;

                reservation.attendances.forEach(attendance => {
                    attendances.push({
                        ...attendance,
                        programName,
                        created: attendance.created ?? new Date()
                    });
                });
            });
        });


        return NextResponse.json(attendances, { status: 200 });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}
