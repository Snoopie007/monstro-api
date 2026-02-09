import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { members, users } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
import { getRedisClient } from "@/libs/redis";
import { EmailSender } from "@/libs/email";
import { generateOtp } from "@/libs/utils";

import { parsePhoneNumberFromString } from "libphonenumber-js";
import { renderToStaticMarkup } from "react-dom/server";
import UpdateEmailOTP from "@subtrees/emails/UpdateEmailOTP";
const MemberProfileProps = {
    params: t.Object({
        mid: t.String(),
    }),
    body: t.Object({
        firstName: t.String(),
        lastName: t.Optional(t.String()),
        email: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        dob: t.Optional(t.Union([t.Null(), t.Date()])),
        gender: t.Optional(t.String()),
    }),
};

const redis = getRedisClient();

const expiresAt = 60 * 60 * 24; // 24 hours
const emailSender = new EmailSender();


export function memberProfile(app: Elysia) {
    app.patch("/", async ({ status, params, body }) => {
        const { mid } = params;
        const { phone, dob, ...rest } = body;

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
            await db.transaction(async (tx) => {
                const [member] = await tx.update(members).set({
                    ...rest,
                    phone: phoneNumber,
                    dob: dob ? new Date(dob) : null,

                }).where(eq(members.id, mid)).returning({ userId: members.userId });
                if (!member) {
                    return await tx.rollback();
                }
                const name = `${rest.firstName} ${rest.lastName}`;

                await tx.update(users).set({ name }).where(eq(users.id, member.userId));
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

    app.patch("/email/verify", async ({ status, body, params }) => {
        const { token } = body;
        const { mid } = params;
        try {
            const RedisKey = `emailUpdate:${mid}`;
            const cachedToken: string | null = await redis.get(RedisKey);

            if (!cachedToken) {
                return status(400, { error: "Invalid or expired token." });
            }

            // Redis value should be: <token>::<email>::<createdAtTimestampInSeconds>
            const [tokenRedis, email, timestamp] = cachedToken.split("::");

            // Validate the token itself
            if (token !== tokenRedis) {
                return status(400, { error: "Invalid or expired token." });
            }

            // Check if 60 minutes have passed since the token was created
            const timestampDate = new Date(Number(timestamp) * 1000);
            const now = new Date();
            const diffMinutes = (now.getTime() - timestampDate.getTime()) / (60 * 1000);

            // If more than 60 minutes have passed, token is expired.
            if (diffMinutes > 60) {
                return status(400, { error: "Token expired." });
            }

            await db.transaction(async (tx) => {
                const member = await tx.query.members.findFirst({
                    where: eq(members.id, mid),

                });
                if (!member) {
                    return await tx.rollback();
                }
                await tx.update(users).set({ email }).where(eq(users.id, member.userId));
                await tx.update(members).set({ email }).where(eq(members.id, mid));
            });

            // Clean up the token from Redis after successful use
            await redis.del(RedisKey);

            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, {
        params: t.Object({
            mid: t.String(),
        }),
        body: t.Object({
            token: t.String(),
        }),
    })
    app.post("/email/token", async ({ status, body, params }) => {
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
                return status(400, { error: "This is the same email." });
            }

            const RedisKey = `emailUpdate:${member?.id}`;
            const token = generateOtp();
            redis.set(RedisKey, `${token}::${email}::${Math.floor(Date.now() + 30 * 60 * 1000 / 1000)}`, { ex: expiresAt })

            await emailSender.sendAsync({
                html: renderToStaticMarkup(UpdateEmailOTP({
                    member: { firstName: member?.firstName ?? '', lastName: member?.lastName ?? '' },
                    update: { email, token },
                })),

                to: email,
                subject: 'Verify your email address',
            });


            return status(200, { success: true })
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" })
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
