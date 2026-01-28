import { Elysia } from "elysia";
import { db } from "@/db/db";
import { members, users, accounts } from "@/db/schemas";
import { generateDiscriminator, generateReferralCode, generateUsername, handleAdditionalData } from "@/libs/utils";
import bcrypt from "bcryptjs";
import type { Member } from "@/types/member";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";
import { AuthAdditionalDataSchema } from "@/libs/schemas";
export async function mobileRegister(app: Elysia) {
    app.post('/register', async ({ status, body }) => {
        const { password, firstName, lastName, email, phone, additionalData } = body;



        const normalizedEmail = email.trim().toLowerCase();
        let normalizedPhone: string | undefined = undefined;
        if (phone) {
            const parsedPhoneNumber = parsePhoneNumberFromString(phone, "US");
            if (!parsedPhoneNumber || !(parsedPhoneNumber.isValid() || parsedPhoneNumber.isPossible())) {
                return status(400, { error: "Invalid phone number" });
            }
            normalizedPhone = parsedPhoneNumber.format("E.164");
        }
        try {
            let member: Member | undefined;

            // Look for existing member with this email at the given location
            member = await db.query.members.findFirst({
                where: (m, { eq }) => eq(m.email, normalizedEmail),
                with: {
                    user: true
                }
            });

            let user = member?.user;
            if (!user) {
                user = await db.query.users.findFirst({
                    where: (u, { eq }) => eq(u.email, normalizedEmail),

                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            await db.transaction(async (tx) => {

                if (!user) {
                    const [newUser] = await tx.insert(users).values({
                        name: `${firstName} ${lastName}`,
                        email: normalizedEmail,
                        username: generateUsername(`${firstName} ${lastName}`),
                        discriminator: generateDiscriminator(),
                    }).onConflictDoNothing({
                        target: [users.email]
                    }).returning();

                    if (!newUser) {
                        console.log("Failed to create user");
                        await tx.rollback();
                        return;
                    }

                    user = newUser;
                }

                if (!member) {
                    const [newMember] = await tx
                        .insert(members)
                        .values({
                            firstName,
                            lastName,
                            phone: normalizedPhone,
                            email: normalizedEmail,
                            userId: user.id,
                            referralCode: generateReferralCode(),
                        }).returning();
                    if (!newMember) {
                        console.log("Failed to create member");
                        await tx.rollback();
                        return;
                    }
                    member = newMember;
                }

                await tx.insert(accounts).values({
                    userId: user.id,
                    provider: "credential",
                    type: 'email',
                    accountId: normalizedEmail,
                    password: hashedPassword,
                }).onConflictDoNothing({
                    target: [accounts.accountId, accounts.provider],
                })
            });

            if (!member) {
                return status(500, { error: "Failed to create account" });
            }

            if (additionalData) {
                handleAdditionalData(additionalData, member);
            }
            return status(200, member);
        } catch (error) {
            console.log(error);
            return status(500, { error: "Failed to migrate" });
        }
    }, {
        body: z.object({
            password: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            email: z.string(),
            phone: z.string().optional(),
            additionalData: AuthAdditionalDataSchema.optional(),
        }),
    });
    return app;
}

