import { db } from "../../../../../../../../db/db";
import { memberLocations, memberSubscriptions, users, members, familyMembers, locations } from '../../../../../../../../db/schemas';
import { EmailSender } from "../../../../../../../../libs/server/emails";
import { NextResponse } from "next/server";
import { InviteEmailTemplate } from '../../../../../../../../templates/emails/MemberInvite';
import { MonstroData } from '../../../../../../../../libs/data';
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
    try {
        const { firstName, lastName, email, locationId, familyMemberId, relation, referral, planId, programId } = await req.json();

        const member = await db.query.members.findFirst({
            where: eq(members.email, email),
        });
        console.log("Member: ", member);

        const location = await db.query.locations.findFirst({
            where: eq(locations.id, locationId),
        });


        const familyMember = await db.query.members.findFirst({
            where: eq(members.id, familyMemberId),
        });

        if(!familyMember){
            return NextResponse.json({ error: "Family member not found" }, { status: 404 });
        }

        console.log("Family Member:", familyMember);


        if (member) {

            const memberLocation = await db.query.memberLocations.findFirst({
                where: (memberLocation, { eq }) => eq(memberLocation.memberId, member.id) && eq(memberLocation.locationId, locationId),
            });
            console.log(memberLocation);

            if (memberLocation) {
                if (!(planId && programId)) {

                    try {
                        const emailSender = new EmailSender();
                        await emailSender.send(email, 'Welcome to Monstro', InviteEmailTemplate, {
                            ui: { button: "Join the class." },
                            location: { name: location?.name },
                            monstro: MonstroData,
                            member: { name: firstName },
                        });
                        console.log(`Email sent to ${email}`);
                    } catch (emailError) {
                        console.error(`Failed to send email to ${email}:`, emailError);
                    }

                    return NextResponse.json({ error: "Please Signup first" }, { status: 400 });
                }

                try {
                    const emailSender = new EmailSender();
                    await emailSender.send(email, 'Welcome to Monstro', InviteEmailTemplate, {
                        ui: { button: "Join the class." },
                        location: { name: location?.name },
                        monstro: MonstroData,
                        member: { name: firstName },
                    });
                    console.log(`Email sent to ${email}`);
                } catch (emailError) {
                    console.error(`Failed to send email to ${email}:`, emailError);
                }


                return NextResponse.json({ message: `Family member has sent you an invite with the relation of ${relation}` });
            } else {

                await db.insert(memberLocations).values({
                    memberId: member.id,
                    locationId: locationId,
                    status: 'incomplete',
                    created: new Date(),
                });

                await db.insert(memberSubscriptions).values({
                  payerId: familyMemberId,
                  beneficiaryId: member.id,
                  planId: planId,
                  locationId: locationId,
                  startDate: new Date(),
                  currentPeriodStart: new Date(),
                  currentPeriodEnd: new Date(),
                  created: new Date(),
                  paymentType: 'cash',
                } as any);

                await db.insert(familyMembers).values({
                    memberId: member.id,
                    relatedMemberId: familyMemberId,
                    relationship: relation,
                    created: new Date(),
                });



                try {
                    const emailSender = new EmailSender();
                    await emailSender.send(email, 'Welcome to Monstro', InviteEmailTemplate, {
                        ui: { button: "Join the class." },
                        location: { name: location?.name },
                        monstro: MonstroData,
                        member: { name: firstName },
                    });
                    console.log(`Email sent to ${email}`);
                } catch (emailError) {
                    console.error(`Failed to send email to ${email}:`, emailError);
                }

                return NextResponse.json({ message: `Family member has sent you an invite with the relation of ${relation}` });
            }
        } else {

            const [user] = await db.insert(users).values({
                name: firstName,
                email: email,
                password: '',
                created: new Date(),
            }).returning();


            const [newMember] = await db.insert(members).values({
                userId: user.id,
                firstName: firstName,
                lastName: lastName,
                email: email,
                phone: '',
                referralCode: '23131',
                currentPoints: 0,
                created: new Date(),
            }).returning();

            await db.insert(memberSubscriptions).values({
              payerId: newMember.id,
              locationId: locationId,
              startDate: new Date(),
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(),
              created: new Date(),
              paymentType: 'cash',
            });

            await db.insert(memberLocations).values({
                memberId: newMember.id,
                locationId: locationId,
                created: new Date(),
            });


            await db.insert(familyMembers).values({
                memberId: newMember.id,
                relatedMemberId: newMember.id,
                relationship: relation,
                created: new Date(),
            });

            return NextResponse.json({ message: "New member created and family member relationship established" });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}