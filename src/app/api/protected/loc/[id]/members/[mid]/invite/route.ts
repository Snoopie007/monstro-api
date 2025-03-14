
import { EmailSender } from '@/libs/server/emails';
import { MonstroData } from '@/libs/data';
import { NextRequest, NextResponse, } from 'next/server';
import { InviteEmailTemplate } from '@/templates/emails/MemberInvite';
import { db } from '@/db/db';
import { memberLocations } from '@/db/schemas';
import { eq, and } from 'drizzle-orm';



export async function POST(req: NextRequest, props: { params: Promise<{ id: number, mid: number }> }) {
    const params = await props.params;
    const data = await req.json();

    try {

        const ml = await db.query.memberLocations.findFirst({
            where: (memberLocations, { eq, and }) => and(eq(memberLocations.memberId, params.mid), eq(memberLocations.locationId, params.id)),
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
        await emailSender.send(member.email, `Welcome to ${location.name}`, InviteEmailTemplate, {
            ui: {
                btnText: "Accept Invite",
                btnUrl: `https://member.mymonstroapp.com/invite/${data.id}?email=${member.email}`
            },
            location,
            monstro: MonstroData,
            member
        });
        await db.update(memberLocations).set({
            inviteDate: new Date(),
        }).where(and(eq(memberLocations.memberId, data.mid), eq(memberLocations.locationId, data.id)));

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

