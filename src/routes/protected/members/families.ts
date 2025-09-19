import { Elysia } from "elysia";
import { db } from "@/db/db";
import { familyMembers, members, users } from "@/db/schemas";
import type { FamilyMember } from "@/types";
import { generateReferralCode } from "@/libs/utils";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { emailQueue } from "@/libs/queues";




export async function memberFamilies(app: Elysia) {
    return app.get("/families", async ({ status, params }) => {
        const { mid } = params as { mid: string };
        try {
            const families = await db.query.familyMembers.findMany({
                where: (familyMembers, { eq }) => eq(familyMembers.relatedMemberId, mid),
                with: {
                    member: true,
                },
            });
            return status(200, families);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch families" });
        }
    }).post("/families", async ({ status, params, body }) => {
        const { mid } = params as { mid: string };
        const { relationship, ...rest } = body as any;

        try {

            // Handle phone number validation if provided
            if (rest.phone && typeof rest.phone === "string" && rest.phone.trim() !== "") {

                const phoneNumber = parsePhoneNumberFromString(rest.phone, "US");

                if (!phoneNumber) {
                    throw new Error(JSON.stringify({
                        error: "Invalid phone number",
                        details: {
                            input: rest.phone,
                        },
                    }));
                }

                if (phoneNumber?.isValid() || phoneNumber?.isPossible()) {
                    // Use the formatted number if valid, otherwise use the original for test numbers
                    rest.phoneNumber = phoneNumber?.isValid()
                        ? phoneNumber.formatNational()
                        : rest.phone;
                } else {
                    throw new Error("Invalid phone number");
                }

                delete rest.phone;
            } else {
                // Set phoneNumber to empty string if no phone provided
                rest.phoneNumber = "";
            }

            const existingMember = await db.query.members.findFirst({
                where: (members, { eq }) => eq(members.email, rest.email),
                with: {
                    familyMembers: {
                        where: (familyMembers, { eq }) =>
                            eq(familyMembers.relatedMemberId, mid),
                    },
                },
            });


            let fm: FamilyMember | undefined;

            if (existingMember) {
                if (existingMember.familyMembers.length > 0) {
                    throw new Error("This member already belongs to your family.");
                } else {
                    const [familyMember] = await db.insert(familyMembers).values({
                        memberId: existingMember.id,
                        relatedMemberId: mid,
                        relationship: relationship,
                    }).returning();

                    if (!familyMember?.id) {
                        throw new Error("Failed to create family member");
                    }

                    const { ...restMember } = existingMember;
                    fm = {
                        ...familyMember,
                        member: restMember,
                    };
                }
            } else {
                let uid: string | undefined;
                const existingUser = await db.query.users.findFirst({
                    where: (users, { eq }) => eq(users.email, rest.email),
                    columns: {
                        id: true,
                    },
                });

                uid = existingUser?.id;
                fm = await db.transaction(async (tx) => {
                    if (!uid) {
                        const [user] = await tx
                            .insert(users)
                            .values({
                                name: `${rest.firstName} ${rest.lastName}`,
                                email: rest.email,
                                password: "",
                            })
                            .returning({ id: users.id });
                        uid = user?.id;
                    }

                    const [member] = await tx.insert(members).values({
                        userId: uid,
                        ...rest,
                        referralCode: generateReferralCode(),
                        currentPoints: 0,
                    }).returning();


                    if (!member) {
                        return await tx.rollback();
                    }

                    const [familyMember] = await tx.insert(familyMembers).values({
                        memberId: member.id,
                        relatedMemberId: mid,
                        relationship,
                    }).returning();


                    if (!familyMember?.id) {
                        return await tx.rollback();
                    }
                    let inverseRelationship = relationship;

                    if (relationship === "parent") {
                        inverseRelationship = "child";
                    } else if (relationship === "child") {
                        inverseRelationship = "parent";
                    }

                    await tx.insert(familyMembers).values({
                        memberId: mid,
                        relatedMemberId: member.id,
                        relationship: inverseRelationship,
                    }).onConflictDoNothing({
                        target: [familyMembers.memberId, familyMembers.relatedMemberId],
                    });

                    return {
                        ...familyMember,
                        member: member,
                    };
                });
            }

            // Send email to the invited member
            await emailQueue.add("email", {
                to: fm?.member?.email,
                subject: "You've been invited to join a family on Monstro",
                template: "InviteEmailTemplate",
                metadata: {
                    member: fm?.member,
                },
            });

            return status(200, fm);
        } catch (error) {
            console.error(error);
            const msg = error instanceof Error ? error.message : "Failed to create family member";
            return status(500, { error: msg });
        }
    });
}
