
import { sendEmailViaApi } from '@/libs/server/emails';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { memberLocations } from '@subtrees/schemas';
import { eq, and } from 'drizzle-orm';

export async function POST(_req: NextRequest, props: { params: Promise<{ id: string, mid: string }> }) {
    const params = await props.params;
    try {

        const ml = await db.query.memberLocations.findFirst({
            where: (memberLocations, { eq, and }) => and(
                eq(memberLocations.memberId, params.mid),
                eq(memberLocations.locationId, params.id)
            ),
            with: {
                member: true,
                location: true
            }
        })
        if (!ml) {
            throw new Error('Member not found')
        }

        const { member, location } = ml

        await sendEmailViaApi({
            recipient: member.email,
            template: 'MemberInviteEmail',
            subject: `Welcome to ${location.name}`,
            data: {
                location: {
                    name: location.name,
                    id: params.id,
                },
                member: {
                    firstName: member.firstName,
                    id: params.mid,
                },
            }
        });
        await db.update(memberLocations).set({
            status: "incomplete"
        }).where(and(eq(memberLocations.memberId, params.mid), eq(memberLocations.locationId, params.id)));

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

