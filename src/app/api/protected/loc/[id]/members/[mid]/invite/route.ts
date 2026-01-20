
import { sendEmailViaApi } from '@/libs/server/emails';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { memberLocations } from '@/db/schemas';
import { migrateMembers } from '@/db/schemas/MigrateMembers';
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

        // Create migrateMembers record for invite tracking
        const [migrateMember] = await db.insert(migrateMembers).values({
            firstName: member.firstName || '',
            lastName: member.lastName || '',
            email: member.email,
            phone: member.phone || '',
            locationId: params.id,
            memberId: member.id,
            lastRenewalDay: new Date(),
            payment: false,
        }).returning();

        await sendEmailViaApi({
            recipient: member.email,
            template: 'MemberInviteEmail',
            subject: `Welcome to ${location.name}`,
            data: {
                ui: {
                    btnText: "Accept Invite",
                    btnUrl: `https://m.monstro-x.com/register?migrateId=${migrateMember.id}`
                },
                location,
                member
            }
        });
        await db.update(memberLocations).set({
            inviteDate: new Date(),
            status: "incomplete"
        }).where(and(eq(memberLocations.memberId, params.mid), eq(memberLocations.locationId, params.id)));

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

