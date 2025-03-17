import { NextResponse } from 'next/server';

import { db } from '@/db/db';
import { eq, and, ne, sql, isNull } from 'drizzle-orm';
import { programs } from '@/db/schemas/programs';
import { memberSubscriptions, memberPlans, memberPackages } from '@/db/schemas/MemberPlans';
import { alias } from 'drizzle-orm/pg-core';
import { familyMembers, locations, memberLocations, members, users } from '@/db/schemas';
import { MonstroData, plans } from '@/libs/data';
import { InviteEmailTemplate } from '@/templates/emails/MemberInvite';
import { EmailSender } from '@/libs/server/emails';


type Props = {
    mid: number,
    id: number
}

export async function GET(req: Request, props: { params: Promise<Props> }) {
    const params = await props.params;
    try {
        const subscriptions = [];
        const packages = [];
        const subs = await db.select({
            planName: memberPlans.name,
            planId: memberPlans.id,
            programName: programs.name,
            subscriptionId: memberSubscriptions.id,
            planFamilyLimit: memberPlans.familyMemberLimit,
        }).from(memberSubscriptions)
            .where(and(
                eq(memberSubscriptions.memberId, params.mid),
                eq(memberSubscriptions.locationId, params.id),
                eq(memberSubscriptions.memberPlanId, memberPlans.id)
            ))
            .innerJoin(memberPlans, and(
                eq(memberSubscriptions.memberPlanId, memberPlans.id),
                eq(memberPlans.family, true)
            ))
            .innerJoin(programs, eq(memberPlans.programId, programs.id));

        for await (const sub of subs) {
            const childSubCount = await db.select({
                count: sql<number>`count(*)`
            }).from(memberSubscriptions)
                .where(eq(memberSubscriptions.parentId, sub.subscriptionId));
            subscriptions.push({
                ...sub,
                childrenCount: Number(childSubCount[0]?.count ?? 0)
            });
        }
        
        const pkgs = await db.select({
            planName: memberPlans.name,
            programName: programs.name,
            packageId: memberPackages.id,
            planFamilyLimit: memberPlans.familyMemberLimit,
        }).from(memberPackages)
            .where(
                and(
                    eq(memberPackages.memberId, params.mid),
                    eq(memberPackages.locationId, params.id),
                    eq(memberPackages.memberPlanId, memberPlans.id)
                ))
            .innerJoin(memberPlans, and(eq(memberPackages.memberPlanId, memberPlans.id), eq(memberPlans.family, false)))
            .innerJoin(programs, eq(memberPlans.programId, programs.id));

        for await (const pkg of pkgs) {
            const childSubCount = await db.select({
                count: sql<number>`count(*)`
            }).from(memberPackages)
                .where(eq(memberPackages.parentId, pkg.packageId));
            packages.push({
                ...pkg,
                childrenCount: Number(childSubCount[0]?.count ?? 0)
            });
        }
        //Reorganize
        // How are in the plan already

        return NextResponse.json([...subscriptions, ...packages], { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function POST(req: Request, props: { params: Promise<Props> }) {
    try {
        const params = await props.params;
        const { firstName, lastName, email, phone, familyMemberId, relationship, familyPlanId } = await req.json();
        let emailUrl = "";
        let newMember = false;

        const location = await db.query.locations.findFirst({
            where: eq(locations.id, params.id),
        });

        if(!location) {
            return NextResponse.json({ error: "Locaiton not found" }, { status: 404 });
        }

        let member = await db.query.members.findFirst({
            where: eq(members.email, email),
        });

        if(!member) {
            const [user] = await db.insert(users).values({
                name: firstName,
                email: email,
                password: '',
                created: new Date(),
            }).returning();

            const generateReferralCode = () => {
                return Math.random().toString(36).substring(2, 8).toUpperCase();
            };

            [member] = await db.insert(members).values({
                userId: user.id,
                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: phone,
                referralCode: generateReferralCode(),
                currentPoints: 0,
                created: new Date(),
            }).returning();

            newMember = true;
        }

        const familyMember = await db.query.members.findFirst({
            where: eq(members.id, familyMemberId),
        });

        if (!familyMember) {
            return NextResponse.json({ error: "Family member not found" }, { status: 404 });
        }

        const familyPlan = await db.query.memberPlans.findFirst({
            where: (memberPlans, { eq }) => eq(memberPlans.id, familyPlanId)
        });

        if(!familyPlan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }
        let memberSubscription = undefined;
        let memberPackage = undefined;
        if(familyPlan.type == "one-time") {
            const activeMemberPackage = await db.query.memberPackages.findMany({
                where: (memberSubscriptions, { eq }) => and(
                    eq(memberSubscriptions.memberPlanId, familyPlanId),
                    eq(memberSubscriptions.memberId, familyMemberId),
                    isNull(memberSubscriptions.parentId),
                    eq(memberSubscriptions.locationId, params.id),
                    eq(memberSubscriptions.status, 'active'),
                )
            });
    
            for await (const pkg of activeMemberPackage) {
                const childSubCount = await db.select({
                    count: sql<number>`count(*)`
                }).from(memberPackages)
                .where(eq(memberPackages.parentId, pkg.id));
                
                if(childSubCount.length && childSubCount[0].count < familyPlan.familyMemberLimit) {
                    memberPackage = pkg;
                }
            }
            
        } else if(familyPlan.type == "recurring") {
            const activeMemberSubscriptions = await db.query.memberSubscriptions.findMany({
                where: (memberSubscriptions, { eq }) => and(
                    eq(memberSubscriptions.memberPlanId, familyPlanId),
                    eq(memberSubscriptions.memberId, familyMemberId),
                    isNull(memberSubscriptions.parentId),
                    eq(memberSubscriptions.locationId, params.id),
                    eq(memberSubscriptions.status, 'active'),
                    isNull(memberSubscriptions.endedAt)
                )
            });
    
            for await (const subscription of activeMemberSubscriptions) {
                const childSubCount = await db.select({
                    count: sql<number>`count(*)`
                }).from(memberSubscriptions)
                .where(eq(memberSubscriptions.parentId, subscription.id));
                
                if(childSubCount.length && childSubCount[0].count < familyPlan.familyMemberLimit) {
                    memberSubscription = subscription;
                }
            }

        }
        // if(member) {
            let memberLocation = await db.query.memberLocations.findFirst({
                where: (memberLocation, { eq }) => and(
                    eq(memberLocation.memberId, member.id),
                    eq(memberLocation.locationId, location.id)
                ),
            });
            if(!memberLocation) {
                const newLocation = await db.insert(memberLocations).values({
                    memberId:member.id,
                    locationId:params.id,
                    status: "active",
                    //set remaining parameters so that member just has to enter password to complete the signup               
                })
            }
            if(familyPlan.type == "one-time" && memberPackage) {
                await db.insert(memberPackages).values({
                    memberPlanId:familyPlanId,
                    locationId: params.id,
                    programId: familyPlan.programId,
                    startDate: memberPackage.startDate,
                    memberId: member.id,
                    parentId: memberPackage.id,
                    paymentMethod: memberPackage.paymentMethod,
                    status: "active",   
                })
                emailUrl = `invite/${params.id}/pkg/${memberPackage.id}`;
            } else if(familyPlan.type == "recurring" && memberSubscription) {
                await db.insert(memberSubscriptions).values({
                    memberPlanId:familyPlanId,
                    locationId:params.id,
                    programId:familyPlan.programId,
                    status:'active',
                    startDate:memberSubscription.startDate,
                    currentPeriodStart: memberSubscription.currentPeriodStart,
                    paymentMethod: memberSubscription.paymentMethod,
                    memberId: member.id,
                    parentId: memberSubscription.id,
                    currentPeriodEnd: memberSubscription.currentPeriodEnd,
                })
                emailUrl = `invite/${params.id}/sub/${memberSubscription.id}`;
            }
            await db.insert(familyMembers).values({
                isPayer: false,
                relatedMemberId: member.id,
                memberId: familyMemberId,
                relationship: relationship,
                created: new Date()
            });

            if(newMember) {
                const emailSender = new EmailSender();
                    await emailSender.send(email, 'Welcome to Monstro', InviteEmailTemplate, {
                        ui: { button: "Join the class.",  btnUrl: emailUrl},
                        location: { name: location?.name },
                        monstro: MonstroData,
                        member: { name: firstName },
                    });
            } else {
                // add email template for members who already have an account
            }
            return NextResponse.json({ message: "New member created and family member relationship established" });
        // }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
