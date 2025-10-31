
import { EmailSender } from '@/libs/server/emails';
import { MonstroData } from '@/libs/data';
import { NextRequest, NextResponse, } from 'next/server';
import { db } from '@/db/db';
import { memberLocations } from '@/db/schemas';
import { eq, and } from 'drizzle-orm';




export async function POST(req: NextRequest, props: { params: Promise<{ id: string, mid: string }> }) {
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
        const emailSender = new EmailSender();
        await emailSender.send({
            options: {
                to: member.email,
                subject: `Welcome to ${location.name}`,
            },
            template: 'MemberInvite',
            data: {
                ui: {
                    btnText: "Accept Invite",
                    btnUrl: `https://m.monstro-x.com/invite/${params.id}?email=${member.email}`
                },
                location,
                monstro: MonstroData,
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

