import { NextResponse } from 'next/server';

import { db } from '@/db/db';

export async function GET(req: Request, props: { params: Promise<{ mid: number, id: number }> }) {
    const params = await props.params;
    try {

        const reservations = await db.query.reservations.findMany({
            where: (reservations, { eq }) => eq(reservations.memberSubscriptionId, params.mid),
            with: {
                attendances: true,
                session: {
                    with: {
                        level: {
                            with: {
                                program: true
                            }
                        }
                    }
                }
            }
        });

        const attendances = reservations.flatMap(e =>
            e.attendances.map(att => ({
                ...att,
                program: e.session?.level?.program || null
            }))
        );

        return NextResponse.json(attendances, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
