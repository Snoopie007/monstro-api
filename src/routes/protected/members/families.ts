import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { accounts, familyMembers, members, users } from "@subtrees/schemas";
import type { FamilyMember } from "@subtrees/types";
import { generateDiscriminator, generateReferralCode, generateUsername } from "@/libs/utils";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import bcrypt from "bcryptjs";
import { EmailSender } from "@/libs/email";
import { renderToStaticMarkup } from "react-dom/server";
import FamilyInviteEmail from "@subtrees/emails/FamilyInvite";
import ChildFamilyEmail from "@subtrees/emails/ChildFamilyEmail";



const MemberFamiliesProps = {
    params: t.Object({
        mid: t.String(),
    }),
};

const userColumns = {
    id: true,
    name: true,
    image: true,
};
const memberColumns = {
    id: true,
    firstName: true,
    lastName: true,
};

const emailSender = new EmailSender();

export async function memberFamilies(app: Elysia) {
    app.group("/families", (app) => {

        app.get("/", async ({ status, params }) => {
            const { mid } = params;
            try {
                const families = await db.query.familyMembers.findMany({
                    where: (familyMembers, { eq }) => eq(familyMembers.relatedMemberId, mid),
                    with: {

                        member: {
                            with: {
                                user: {
                                    columns: userColumns,
                                },
                            },
                        },
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

                        if (temporaryPassword) {
                            emailSender.send({
                                html: renderToStaticMarkup(ChildFamilyEmail({
                                    member: {
                                        firstName: member.firstName,
                                    },
                                    childName: `${firstName} ${lastName}`,
                                    email: normalizedEmail,
                                    password: temporaryPassword,
                                })),
                                to: member.email,
                                subject: `Here is your child's account details to Monstro X`,
                            });
                        }


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
            const { email, phone, unqiueUsername, relationship } = body;

            if (!relationship) {
                return status(400, { error: "Relationship is required" });
            }

            if (!email && !phone && !unqiueUsername) {
                return status(400, { error: "Please provide at least one of: email, phone, or username" });
            }


            try {
                let existingMember: Record<string, any> | undefined;
                let normalizedContact: string | undefined = undefined;
                if (email) {
                    normalizedContact = email.trim().toLowerCase();

                    existingMember = await db.query.members.findFirst({
                        where: (m, { eq }) => eq(m.email, normalizedContact!),
                        columns: memberColumns,
                        with: {
                            user: {
                                columns: userColumns,
                            },
                        },
                    });
                } else if (phone) {
                    const parsedPhoneNumber = parsePhoneNumberFromString(phone, "US");
                    if (!parsedPhoneNumber || !(parsedPhoneNumber.isValid() || parsedPhoneNumber.isPossible())) {
                        return status(400, { error: "Invalid phone number" });
                    }

                    normalizedContact = parsedPhoneNumber.format("E.164");
                    existingMember = await db.query.members.findFirst({
                        where: (m, { eq }) => eq(m.phone, normalizedContact!),
                        columns: memberColumns,
                        with: {
                            user: {
                                columns: userColumns,
                            },
                        },
                    });
                } else if (unqiueUsername) {
                    normalizedContact = unqiueUsername.trim();
                    const [username, discriminator] = normalizedContact.split("#");
                    if (!username || !discriminator) {
                        return status(400, { error: "Invalid username" });
                    }


                    const user = await db.query.users.findFirst({
                        where: (m, { eq, and }) => and(eq(m.username, username), eq(m.discriminator, Number(discriminator))),
                        columns: userColumns,
                        with: {
                            member: {
                                columns: memberColumns,
                            },
                        },
                    });
                    if (user) {
                        const { member, ...restUser } = user;
                        existingMember = {
                            ...member,
                            user: restUser,
                        };
                    }
                }



                const [familyMember] = await db.insert(familyMembers).values({
                    memberId: existingMember?.id ?? undefined,
                    relatedMemberId: mid,
                    relationship,
                    contact: normalizedContact,
                    status: "pending",
                }).returning();

                if (!familyMember) {
                    return status(500, { error: "Failed to invite family member" });
                }


                if (email) {
                    const firstName = 'John';
                    emailSender.send({
                        html: renderToStaticMarkup(FamilyInviteEmail({
                            member: { firstName },
                            familyId: familyMember.id,
                        })),
                        to: email,
                        subject: `${firstName} has invited you to join Monstro X`,
                    });
                    /// TODO: Send email to the new family member
                } else if (phone) {
                    /// TODO: Send SMS to the new family member
                } else if (unqiueUsername) {
                    // Send push notification to the new family member
                }




                return status(200, {
                    ...familyMember,
                    relatedMember: existingMember,
                });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to invite family member" });
            }
        }, {
            ...MemberFamiliesProps,
            body: t.Object({
                relationship: t.Union([t.Literal("parent"), t.Literal("spouse"),
                t.Literal("child"), t.Literal("sibling"), t.Literal("extended")]),
                email: t.Optional(t.String()),
                phone: t.Optional(t.String()),
                unqiueUsername: t.Optional(t.String()),
            }),
        });

        return app;
    })

    return app;
}
