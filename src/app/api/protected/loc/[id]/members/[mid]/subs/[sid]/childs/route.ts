import { db } from "@/db/db";
import { accounts, familyMembers, memberLocations, members, memberSubscriptions, users } from "@/db/schemas";
import { NextResponse } from "next/server";
import { sql, and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateUsername, generateDiscriminator } from "../../../../utils";

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

/**
 * PATCH - Create a new child member and add them to the parent's family subscription
 *
 * Required body fields:
 * - familyMemberId: The parent member's ID
 * - firstName: Child's first name
 * - lastName: Child's last name
 *
 * Optional body fields:
 * - dob: Child's date of birth (required for validation, must be under 18)
 * - gender: Child's gender
 */
export async function PATCH(req: Request, props: { params: Promise<Params> }) {
    const params = await props.params;
    const { familyMemberId, firstName, lastName, dob, gender } = await req.json();

    try {
        // Validate required fields
        if (!firstName || !lastName) {
            return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
        }

        // Get the parent subscription
        const parentSub = await db.query.memberSubscriptions.findFirst({
            where: (memberSubscriptions, { eq }) => eq(memberSubscriptions.id, params.sid),
            with: {
                member: true,
                pricing: {
                    with: {
                        plan: true,
                    }
                },
            },
        });

        if (!parentSub) {
            return NextResponse.json({ error: "Parent subscription not found" }, { status: 404 });
        }

        // Verify this is a family plan
        const plan = parentSub.pricing?.plan;
        if (!plan?.family) {
            return NextResponse.json({ error: "This is not a family plan" }, { status: 400 });
        }

        // Check family member limit
        const [result] = await db.select({ count: sql<number>`count(*)` })
            .from(memberSubscriptions)
            .where(and(
                eq(memberSubscriptions.parentId, params.sid),
                eq(memberSubscriptions.status, "active")
            ));

        if (result.count >= (plan.familyMemberLimit || 0)) {
            return NextResponse.json({ error: "Family member limit reached" }, { status: 400 });
        }

        // Generate email for child based on parent's email
        if (!parentSub.member?.email) {
            return NextResponse.json({ error: "Parent member email not found" }, { status: 400 });
        }
        const [localPart, domain] = parentSub.member.email.split('@');
        const childEmail = `${localPart}+${firstName.toLowerCase().replace(/\s/g, '')}@${domain}`;

        // Check if a member with this email already exists
        let childMember = await db.query.members.findFirst({
            where: (members, { eq }) => eq(members.email, childEmail),
        });

        if (!childMember) {
            // Generate a random password for the child account
            const generatePassword = Array.from({ length: Math.floor(8 + Math.random() * 3) }, () =>
                Math.random().toString(36).charAt(2 + Math.floor(Math.random() * 34))
            ).join('').toUpperCase();

            // Create user record
            const [user] = await db
                .insert(users)
                .values({
                    name: `${firstName} ${lastName}`,
                    email: childEmail,
                    username: generateUsername(`${firstName} ${lastName}`),
                    discriminator: generateDiscriminator(),
                    isChild: true,
                })
                .returning();

            if (!user) {
                return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
            }

            // Create account credentials
            await db.insert(accounts).values({
                userId: user.id,
                password: await bcrypt.hash(generatePassword, 10),
                provider: "credential",
                type: "email",
                accountId: childEmail,
            });

            // Generate referral code
            const generateReferralCode = () => {
                return Math.random().toString(36).substring(2, 8).toUpperCase();
            };

            // Create member record
            const [m] = await db
                .insert(members)
                .values({
                    userId: user.id,
                    firstName: firstName,
                    lastName: lastName,
                    email: childEmail,
                    phone: null,
                    dob: dob ? new Date(dob) : null,
                    gender: gender || null,
                    referralCode: generateReferralCode(),
                }).returning();

            // Create member location
            await db.insert(memberLocations).values({
                memberId: m.id,
                locationId: params.id,
                status: "active",
            });

            // Create bidirectional family relationship (child -> parent)
            await db.insert(familyMembers).values({
                relatedMemberId: familyMemberId,
                memberId: m.id,
                relationship: "child",
                status: "accepted",
            });

            // Create bidirectional family relationship (parent -> child)
            await db.insert(familyMembers).values({
                relatedMemberId: m.id,
                memberId: familyMemberId,
                relationship: "parent",
                status: "accepted",
            });

            childMember = m;
        }

        // Create the child subscription linked to the parent
        const { id, memberId, locationId, parentId, ...sharedData } = parentSub;
        const [childSubscription] = await db.insert(memberSubscriptions).values({
            ...sharedData,
            parentId: params.sid,
            memberId: childMember.id,
            locationId: params.id,
            status: "active",
        }).returning();

        return NextResponse.json({
            ...childSubscription,
            member: childMember,
        }, { status: 200 });

    } catch (error) {
        console.error("Error creating child member:", error);
        return NextResponse.json({ error: "An error occurred while creating child member" }, { status: 500 });
    }
}