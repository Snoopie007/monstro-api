import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { accounts, familyMembers, members, users } from "@/db/schemas";
import type { FamilyMember } from "@/types";
import { generateDiscriminator, generateReferralCode, generateUsername } from "@/libs/utils";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { EmailSender } from "@/libs/email";
import bcrypt from "bcryptjs";

const emailSender = new EmailSender();



const MemberFamiliesProps = {
    params: t.Object({
        mid: t.String(),
    }),

};

export async function memberFamilies(app: Elysia) {
    app.group("/families", (app) => {

        app.get("/", async ({ status, params }) => {
            const { mid } = params;
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
        }, MemberFamiliesProps)

        app.post("/child", async ({ status, params, body }) => {
            const { mid } = params;
            const { firstName, lastName, phone, dod, gender } = body;



            let phoneNumber: string | null = null;
            if (phone) {
                const parsedPhoneNumber = parsePhoneNumberFromString(phone, "US");
                if (parsedPhoneNumber && (parsedPhoneNumber.isValid() || parsedPhoneNumber.isPossible())) {
                    phoneNumber = parsedPhoneNumber.format("E.164");
                } else {
                    phoneNumber = phone;
                }
            }

            try {

                const parentMember = await db.query.members.findFirst({
                    where: (members, { eq }) => eq(members.id, mid),
                    columns: {
                        email: true,
                    }
                });

                if (!parentMember) {
                    return status(400, { error: "Parent member not found" });
                }
                // Create the child's email as "parentEmail+firstName"
                const [user, domain] = parentMember.email.trim().toLowerCase().split("@");
                const normalizedEmail = `${user}+${firstName.trim().toLowerCase().replace(/\s+/g, "")}@${domain}`;

                const existingMember = await db.query.members.findFirst({
                    where: (members, { eq }) => eq(members.email, normalizedEmail),
                    with: {
                        familyMembers: {
                            where: (familyMembers, { eq }) =>
                                eq(familyMembers.relatedMemberId, mid),
                        },
                    },
                });

                if (existingMember && existingMember.familyMembers.length > 0) {
                    return status(400, { error: "This member already belongs to your family." });
                }

                let family: FamilyMember | undefined;
                let temporaryPassword: string | undefined = undefined;
                if (existingMember) {
                    const [familyMember] = await db.insert(familyMembers).values({
                        memberId: existingMember.id,
                        relatedMemberId: mid,
                        relationship: "child",
                        status: "accepted",
                    }).returning();

                    if (!familyMember?.id) {
                        return status(500, { error: "Failed to create family member" });
                    }

                    const { familyMembers: _, ...restMember } = existingMember;
                    family = {
                        ...familyMember,
                        member: restMember,
                    };

                } else {
                    let uid: string | undefined;
                    const existingUser = await db.query.users.findFirst({
                        where: (users, { eq }) => eq(users.email, normalizedEmail),
                        columns: {
                            id: true,
                        },
                    });

                    uid = existingUser?.id;
                    family = await db.transaction(async (tx) => {
                        if (!uid) {
                            const [user] = await tx
                                .insert(users)
                                .values({
                                    email: normalizedEmail,
                                    name: `${firstName} ${lastName}`,
                                    username: generateUsername(`${firstName} ${lastName}`),
                                    discriminator: generateDiscriminator(),
                                    isChild: true,
                                })
                                .returning({ id: users.id });
                            if (!user) {
                                return await tx.rollback();
                            }

                            // Use a generated temporary password for the new user registration
                            // Create a temporary password that is not just numbers, but includes both letters and numbers
                            const tempPassword = Math.random().toString(36).slice(-10) +
                                Math.random().toString(36).replace(/[^a-z]+/g, '').slice(-2);
                            temporaryPassword = tempPassword;
                            const hashedPassword = await bcrypt.hash(tempPassword, 10);
                            await tx.insert(accounts).values({
                                userId: user.id,
                                provider: "credential",
                                type: 'email',
                                accountId: normalizedEmail,
                                password: hashedPassword,
                            });

                            uid = user.id;
                        }

                        const [member] = await tx.insert(members).values({
                            userId: uid || "",
                            firstName,
                            lastName,
                            email: normalizedEmail,
                            phone: phoneNumber,
                            referralCode: generateReferralCode(),
                        }).returning();


                        if (!member) {
                            return await tx.rollback();
                        }
                        const [familyMember] = await tx.insert(familyMembers).values({
                            memberId: member.id,
                            relatedMemberId: mid,
                            relationship: "child",
                            status: "accepted",
                        }).returning();


                        if (!familyMember?.id) {
                            return await tx.rollback();
                        }


                        await tx.insert(familyMembers).values({
                            memberId: mid,
                            relatedMemberId: member.id,
                            relationship: "parent",
                            status: "accepted",
                        }).onConflictDoNothing({
                            target: [familyMembers.memberId, familyMembers.relatedMemberId],
                        });



                        return {
                            ...familyMember,
                            member: member,
                        };
                    });
                }

                /// Send email with temporary password to the new family member if one and doesn't existing
                return status(200, { family, temporaryPassword });
            } catch (error) {
                console.error(error);
                const msg = error instanceof Error ? error.message : "Failed to create family member";
                return status(500, { error: msg });
            }
        }, {
            ...MemberFamiliesProps,
            body: t.Object({
                firstName: t.String(),
                lastName: t.String(),
                phone: t.Optional(t.String()),
                dod: t.String(),
                gender: t.Optional(t.String()),
            }),
        });

        app.post("/invite", async ({ status, params, body }) => {
            const { mid } = params;
            const { email } = body;

            const normalizedEmail = email.trim().toLowerCase();
            // TODO: Send email to the invited member
            try {
                return status(200, { message: "Family member invited" });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to invite family member" });
            }
        }, {
            ...MemberFamiliesProps,
            body: t.Object({
                email: t.String(),
            }),
        });
        return app;
    })

    return app;
}
