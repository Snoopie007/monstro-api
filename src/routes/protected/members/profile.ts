import Elysia from "elysia";
import { db } from "@/db/db";
import { members, users } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { getRedisClient } from "@/libs/redis";
import { EmailSender } from "@/libs/email";
import { generateOtp } from "@/libs/utils";
import { MonstroData } from "@/libs/data";
import { z } from "zod";


const MemberProfileProps = {
    params: z.object({
        mid: z.string(),
    }),
    body: z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
    }),
};

const redis = getRedisClient();

const expiresAt = 60 * 60 * 24; // 24 hours
const emailSender = new EmailSender();


export function memberProfile(app: Elysia) {
    return app.patch("/", async ({ status, params, body }) => {
        const { mid } = params;
        const data = body as Record<string, any>;

        try {
            await db.transaction(async (tx) => {
                const [member] = await tx.update(members)
                    .set(data)
                    .where(eq(members.id, mid))
                    .returning();
                if (!member) {
                    return await tx.rollback();
                }
                const name = `${data.firstName} ${data.lastName}`;
                await tx.update(users).set({ email: data.email, name }).where(eq(users.id, member.userId));
            });
            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { message: "Internal server error", code: "INTERNAL_SERVER_ERROR" });
        }
    }, MemberProfileProps).patch("/email", async ({ status, body, params }) => {
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
    }, MemberProfileProps)
}
