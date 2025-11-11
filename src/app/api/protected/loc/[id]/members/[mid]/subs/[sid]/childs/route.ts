import { db } from "@/db/db";
import { familyMembers, memberLocations, members, memberSubscriptions, users } from "@/db/schemas";
import { NextResponse } from "next/server";
import { sql, and, eq } from "drizzle-orm";
import { MemberRelationship } from "@/types/DatabaseEnums";
import bcrypt from "bcryptjs";

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




function getInverseRelationship(
    relationship: MemberRelationship
): MemberRelationship {
    const relationshipMap: Record<MemberRelationship, MemberRelationship> = {
        parent: "child",
        child: "parent",
        spouse: "spouse",
        sibling: "sibling",
        other: "other",
    };

    return relationshipMap[relationship] || "other";
}


export async function PATCH(req: Request, props: { params: Promise<Params> }) {
    const params = await props.params;
    const { familyMemberId, firstName, lastName, email, phone } = await req.json();
    const today = new Date();
    try {

        const parentSub = await db.query.memberSubscriptions.findFirst({
            where: (memberSubscriptions, { eq }) => eq(memberSubscriptions.id, params.sid),
            with: {
                member: true,
                plan: true,
            },
        });

        if (!parentSub) {
            throw new Error("Parent subscription not found");
        }



        let childMember = await db.query.members.findFirst({
            where: (members, { eq }) => eq(members.email, email),
        });



        const generatePassword = Array.from({ length: Math.floor(8 + Math.random() * 3) }, () =>
            Math.random().toString(36).charAt(2 + Math.floor(Math.random() * 34))
        ).join('').toUpperCase();

        if (!childMember) {
            const [user] = await db
                .insert(users)
                .values({
                    name: `${firstName} ${lastName}`,
                    email: email,
                    password: await bcrypt.hash(generatePassword, 10),
                })
                .returning();

            const generateReferralCode = () => {
                return Math.random().toString(36).substring(2, 8).toUpperCase();
            };

            const [m] = await db
                .insert(members)
                .values({
                    userId: user.id,
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    phone: phone,
                    referralCode: generateReferralCode(),
                }).returning();


            await db.insert(memberLocations).values({
                memberId: m.id,
                locationId: params.id,
                status: "active",
            }).returning();

            await db.insert(familyMembers).values({
                relatedMemberId: familyMemberId,
                memberId: m.id,
                relationship: "child",
                created: today,
            }).returning();

            await db.insert(familyMembers).values({
                relatedMemberId: m.id,
                memberId: familyMemberId,
                relationship: getInverseRelationship('child'),
                created: today,
            }).returning();

            childMember = m;
        }




        await db.select({ count: sql<number>`count(*)` })
            .from(memberSubscriptions)
            .where(and(
                eq(memberSubscriptions.parentId, params.sid),
                eq(memberSubscriptions.locationId, params.id),
                eq(memberSubscriptions.status, "active")
            ));




        const { id, memberId, locationId, parentId, ...sharedData } = parentSub;
        const [familySubscription] = await db.insert(memberSubscriptions).values({
            ...sharedData,
            parentId: params.sid,
            memberId: familyMemberId,
            locationId: params.id,
            status: "active",
        }).returning();



        return NextResponse.json(familySubscription, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}