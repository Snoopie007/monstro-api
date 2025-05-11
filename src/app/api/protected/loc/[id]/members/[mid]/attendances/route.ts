import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { ExtendedAttendance } from '@/types/attendance';
import { attendances } from '@/db/schemas';

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
                    reservations: {
                        with: {
                            session: {
                                with: {
                                    program: true
                                }
                            },
                            attendance: true
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

                    reservations: {
                        with: {
                            session: {
                                with: {
                                    program: true
                                }
                            },
                            attendance: true
                        }
                    }
                }
            })
        ]);

        const attendances: ExtendedAttendance[] = [];
        const memberPlans = [...(subs || []), ...(pkgs || [])];

        memberPlans.forEach(plan => {
            if (!plan.reservations?.length) return;
            plan.reservations.forEach(reservation => {
                if (!reservation.attendance) return;
                attendances.push({
                    ...reservation.attendance,
                    programName: reservation.session.program.name,
                    created: reservation.attendance.created ?? new Date()
                });
            });
        });


        return NextResponse.json(attendances, { status: 200 });
    } catch (err) {

        return NextResponse.json({ error: err }, { status: 500 });
    }
}



