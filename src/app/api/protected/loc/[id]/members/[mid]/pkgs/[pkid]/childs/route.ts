import { db } from "@/db/db";
import { memberLocations, memberPackages, memberSubscriptions } from "@/db/schemas";
import { NextResponse } from "next/server";
import { sql, and, eq } from "drizzle-orm";

type Params = {
    id: string;
    mid: string;
    pkid: string;
}

export async function GET(req: Request, props: { params: Promise<Params> }) {
    const params = await props.params;
    try {

        const familyPlans = await db.query.memberPackages.findMany({
            where: (memberPackages, { eq, and }) => and(
                eq(memberPackages.locationId, params.id),
                eq(memberPackages.parentId, params.pkid),
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
    const { id, pkid } = await props.params;
    const { familyMemberId } = await req.json();
    try {
        const pkg = await db.query.memberPackages.findFirst({
            where: (mpkgs, { eq, and }) =>
                and(
                    eq(mpkgs.id, pkid),
                    eq(mpkgs.status, "active")
                ),
            with: {
                pricing: {
                    with: {
                        plan: true,
                    }
                },
                location: true,
            },
        });

        if (!pkg) {
            throw new Error("Plan not found");
        }
        const plan = pkg.pricing?.plan;
        if (!plan?.family) {
            throw new Error("This is not a family plan");
        }



        const [result] = await db.select({ count: sql<number>`count(*)` })
            .from(memberPackages)
            .where(and(
                eq(memberPackages.parentId, pkid),
                eq(memberPackages.status, "active")
            ));

        if (result.count >= (plan?.familyMemberLimit || 0)) {
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


        const { memberId, locationId, parentId, ...sharedData } = pkg;

        const [familySubscription] = await db
            .insert(memberPackages)
            .values({
                ...sharedData,
                parentId: pkid,
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