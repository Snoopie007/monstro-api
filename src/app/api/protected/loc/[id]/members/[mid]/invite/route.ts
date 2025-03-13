
import { EmailSender } from '@/libs/server/emails';
import { MonstroData } from '@/libs/data';
import { NextResponse } from 'next/server';
import { InviteEmailTemplate } from '@/templates/emails/MemberInvite';
import { db } from '@/db/db';
import { locations, memberLocations, members } from '@/db/schemas';
import { eq, and } from 'drizzle-orm';
import { encodeId } from '@/libs/server/sqids';

export async function POST(req: Request, props: { params: Promise<{ id: number, mid: number }> }) {

    const { id, mid } = await props.params;

    try {

        const [memberLocation] = await db.select({
            location: locations,
            member: members
        }).from(memberLocations)
            .where(and(eq(memberLocations.memberId, mid), eq(memberLocations.locationId, id)))
            .innerJoin(members, eq(memberLocations.memberId, members.id))
            .innerJoin(locations, eq(memberLocations.locationId, locations.id));


        const emailSender = new EmailSender();
        await emailSender.send(memberLocation.member.email, `From ${memberLocation.location.name}`, InviteEmailTemplate, {
            ui: {
                button: "Accept Invite",
                buttonUrl: `https://member.mymonstroapp.com/invite/${encodeId(id)}?email=${memberLocation.member.email}`
            },
            location: memberLocation.location,
            monstro: MonstroData,
            member: memberLocation.member
        });
        await db.update(memberLocations).set({
            inviteDate: new Date(),
        }).where(and(eq(memberLocations.memberId, mid), eq(memberLocations.locationId, id))).returning();

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

