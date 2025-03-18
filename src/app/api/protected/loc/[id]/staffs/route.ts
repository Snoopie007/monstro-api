

import { db } from "@/db/db";
import { users } from "@/db/schemas";
import { and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { InviteEmailTemplate } from '@/templates/emails/MemberInvite';
import { MonstroData } from '@/libs/data';
import { EmailSender } from "@/libs/server/emails";


type StaffProps = {
    id: number
}

export async function GET(req: Request, props: { params: Promise<StaffProps> }) {
    const params = await props.params;
    try {
        const staffs = await db.query.staffsLocations.findMany({
            where: (staffsLocations, { eq }) => and(eq(staffsLocations.locationId, params.id)),
            with: {
                staff: true,
                roles: true    
            }
        })
        return NextResponse.json(staffs, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function POST(req: Request, props: { params: Promise<StaffProps> }) {
    const params = await props.params;
    const data = await req.json()
    const role = await db.query.roles.findFirst({
        where: (roles, { eq }) => eq(roles.id, data.roleId)
    })

    if (!role) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    const existingUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, data.email)
    })

    if (existingUser) {
        try {
            const emailSender = new EmailSender();
            await emailSender.send(existingUser.email, 'Welcome to Monstro', InviteEmailTemplate, {
                ui: { button: "Join the class." },
                location: { name: existingUser?.name },
                monstro: MonstroData,
                member: { name:  existingUser?.name },
            });
            console.log(`Email sent to ${existingUser.email}`);
            return NextResponse.json({ success: true }, { status: 200 })
        } catch (emailError) {
            console.error(`Failed to send email to ${existingUser.email}:`, emailError);
            return NextResponse.json({ error: emailError }, { status: 500 })
        }
    }
    else {
        await db.insert(users).values({
            email: data.email,
            name: data.name,
            password: data.password,
            created: new Date()
        })

        try {
            const emailSender = new EmailSender();
            await emailSender.send(data.email, 'Welcome to Monstro', InviteEmailTemplate, {
                ui: { button: "Join the class." },
                location: { name: data?.name },
                monstro: MonstroData,
                member: { name:  data?.name },
            });
            console.log(`Email sent to ${data.email}`);
            return NextResponse.json({ success: true }, { status: 200 })
        } catch (emailError) {
            console.error(`Failed to send email to ${data.email}:`, emailError);
            return NextResponse.json({ error: emailError }, { status: 500 })
        }
        
    }
        

    
}