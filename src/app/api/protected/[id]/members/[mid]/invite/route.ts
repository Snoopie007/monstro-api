
import { EmailSender } from '@/libs/server/emails';
import { MonstroData } from '@/libs/data';
import { NextResponse } from 'next/server';
import { InviteEmailTemplate } from '@/templates/emails/MemberInvite';
import { db } from '@/db/db';
import { memberLocations } from '@/db/schemas';
import { eq, and } from 'drizzle-orm';



export async function POST(req: Request) {
    const data = await req.json();

    try {

        await db.update(memberLocations).set({
            progress: {
                selectProgramId: null,
                selectPlanId: null,
                currentStep: 2,
                completedSteps: [1]
            }
        }).where(and(eq(memberLocations.memberId, data.mid), eq(memberLocations.locationId, data.id)));

        const emailSender = new EmailSender();
        await emailSender.send('stevey@simplygrowonline.com', 'Welcome to Monstro', InviteEmailTemplate, {
            ui: {
                button: "Join the class."
            },
            location: {
                name: 'Gracie\'s Gym',
            },
            monstro: MonstroData,
            member: {
                name: 'John Doe',
            }
        });

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

