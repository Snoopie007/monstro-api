import { db } from "@/db/db";
import { memberLocations, memberSubscriptions } from "@/db/schemas";
import { NextResponse } from "next/server";
import { sql, and, eq } from "drizzle-orm";

type Params = {
    id: string;
    mid: string;
    sid: string;
}

export async function GET(req: Request, props: { params: Promise<Params> }) {
    const params = await props.params;
    try {

        const familyPlans = await db.query.memberSubscriptions.findMany({
            where: (memberSubscriptions, { eq, and }) => and(
                eq(memberSubscriptions.locationId, params.id),
                eq(memberSubscriptions.parentId, params.sid),
            ),
            with: {
                member: true,
            },
        });

        return NextResponse.json(familyPlans, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 });
    }
}


export async function POST(req: Request, props: { params: Promise<Params> }) {
    const { id, sid } = await props.params;
    const { familyMemberId } = await req.json();
    try {
        const sub = await db.query.memberSubscriptions.findFirst({
            where: (memberSubscriptions, { eq, and }) =>
                and(
                    eq(memberSubscriptions.id, sid),
                    eq(memberSubscriptions.status, "active")
                ),
            with: {
                plan: true,
                location: true,
            },
        });

        if (!sub) {
            throw new Error("Plan not found");
        }
        if (!sub.plan.family) {
            throw new Error("This is not a family plan");
        }



        const [result] = await db.select({ count: sql<number>`count(*)` })
            .from(memberSubscriptions)
            .where(and(
                eq(memberSubscriptions.parentId, sid),
                eq(memberSubscriptions.status, "active")
            ));

        if (result.count >= sub.plan.familyMemberLimit) {
            throw new Error("Family member limit reached");
        }

        let memberLocation = await db.query.memberLocations.findFirst({
            where: (memberLocation, { eq }) =>
                and(
                    eq(memberLocation.memberId, familyMemberId),
                    eq(memberLocation.locationId, id)
                ),
            with: {
                member: true,
            },
        });

        if (!memberLocation) {
            const member = await db.query.members.findFirst({
                where: (members, { eq }) => eq(members.id, familyMemberId),
            });
            if (!member) {
                throw new Error("Family member not found");
            }
            const [newMemberLocation] = await db.insert(memberLocations).values({
                memberId: member.id,
                locationId: id,
                status: "active",
            }).returning();



            memberLocation = {
                ...newMemberLocation,
                member: member,
            };
        }


        const { memberId, locationId, parentId, ...sharedData } = sub;

        const [familySubscription] = await db
            .insert(memberSubscriptions)
            .values({
                ...sharedData,
                parentId: sid,
                memberId: familyMemberId,
                locationId: id,
                status: "active",

            }).onConflictDoUpdate({
                target: [memberSubscriptions.memberId, memberSubscriptions.parentId],
                set: {
                    status: "active",
                },
            }).returning();




        // send email to notify 
        return NextResponse.json({
            ...familySubscription,
            member: memberLocation.member
        }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error }, { status: 500 });
    }
}