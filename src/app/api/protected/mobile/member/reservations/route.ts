
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and } from 'drizzle-orm';
import { authenticateMember } from '../utils';
type MemberReservationProps = {
    params: Promise<{ id: number, rid: number }>
}

export async function GET(req: NextRequest, props: MemberReservationProps) {
    const params = await props.params;


    try {
        const authMember = authenticateMember(req);

        const subscription = await db.query.memberSubscriptions.findFirst({
            where: (s, { eq }) => and(
                eq(s.memberId, Number(authMember.member.id)),
                eq(s.locationId, Number(params.id)),
                eq(s.status, 'active')
            ),
            with: {
                reservations: {
                    with: {
                        session: true
                    }
                }
            }
        })

        if (!subscription) {
            return NextResponse.json({ error: "No subscription found" }, { status: 404 });
        };

        return NextResponse.json({ subscription }, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}