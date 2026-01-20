import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { members, users, accounts } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { getRedisClient } from "@/libs/redis";
import { EmailSender } from "@/libs/email";
import { generateOtp } from "@/libs/utils";
import { MonstroData } from "@/libs/data";
import bcrypt from "bcryptjs";

import { parsePhoneNumberFromString } from "libphonenumber-js";
const MemberProfileProps = {
    params: t.Object({
        mid: t.String(),
    }),
    body: t.Object({
        firstName: t.String(),
        lastName: t.Optional(t.String()),
        email: t.String(),
        phone: t.Optional(t.String()),
        dob: t.Optional(t.Date()),
        gender: t.Optional(t.String()),
        password: t.Optional(t.String()),
    }),
};

const redis = getRedisClient();

const expiresAt = 60 * 60 * 24; // 24 hours
const emailSender = new EmailSender();


export function memberProfile(app: Elysia) {
    app.patch("/", async ({ status, params, body }) => {
        const { mid } = params;
        const { password, ...rest } = body;

        let phoneNumber: string | null = null;
        if (rest.phone) {
            const parsedPhoneNumber = parsePhoneNumberFromString(rest.phone, "US");
            if (parsedPhoneNumber && (parsedPhoneNumber.isValid() || parsedPhoneNumber.isPossible())) {
                phoneNumber = parsedPhoneNumber.format("E.164");
            } else {
                phoneNumber = rest.phone;
            }
        }

        try {
            await db.transaction(async (tx) => {
                const [member] = await tx.update(members).set({
                    ...rest,
                    phone: phoneNumber,
                    dob: rest.dob ? new Date(rest.dob) : null,

                }).where(eq(members.id, mid)).returning({ userId: members.userId });
                if (!member) {
                    return await tx.rollback();
                }
                const name = `${rest.firstName} ${rest.lastName}`;


                if (password) {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    await tx.insert(accounts).values({
                        userId: member.userId,
                        provider: "credential",
                        accountId: rest.email,
                        password: hashedPassword,
                    }).onConflictDoNothing({
                        target: [accounts.userId, accounts.provider]
                    });
                }
                await tx.update(users).set({ email: rest.email, name }).where(eq(users.id, member.userId));
            });
            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { message: "Internal server error", code: "INTERNAL_SERVER_ERROR" });
        }
    }, MemberProfileProps)
    app.patch('/completed', async ({ status, params }) => {
        const { mid } = params;
        try {
            await db.update(members).set({ setupCompleted: true }).where(eq(members.id, mid));
            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { message: "Internal server error", code: "INTERNAL_SERVER_ERROR" });
        }
    }, {
        params: t.Object({
            mid: t.String(),
        }),
    })
    app.patch("/email", async ({ status, body, params }) => {
        const { email } = body;
        const { mid } = params;
        try {
            //validate email
            const member = await db.query.members.findFirst({
                where: eq(members.id, mid),
                with: {
                    user: true,
                }
            });

            if (member?.user.email === email || member?.user.email === email) {
                return status(400, { error: "Email already in use" });
            }

            const RedisKey = `emailUpdate:${member?.id}`;
            const token = generateOtp();
            redis.set(RedisKey, `${token}::${email}::${Math.floor(Date.now() / 1000)}`, { ex: expiresAt })



            await emailSender.send({
                options: {
                    to: email,
                    subject: 'Verify your email address',
                },
                template: 'UpdateEmailOTP',
                data: {
                    member: {
                        firstName: member?.firstName,
                        lastName: member?.lastName,
                    },
                    update: {
                        email,
                    },
                    monstro: MonstroData
                }
            });


            return status(200, { email })
        } catch (error) {
            console.error(error);
            return status(422, { error: "Unprocessable Entity" })
        }
    }, {
        params: t.Object({
            mid: t.String(),
        }),
        body: t.Object({
            email: t.String(),
        }),
    })
    return app;
}
