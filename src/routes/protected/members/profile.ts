import Elysia from "elysia";
import { db } from "@/db/db";
import { members, users } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { getRedisClient } from "@/libs/redis";
import { EmailSender } from "@/libs/email";
import { generateOtp } from "@/libs/utils";
import { MonstroData } from "@/libs/data";

const redis = getRedisClient();

const expiresAt = 60 * 60 * 24; // 24 hours
const emailSender = new EmailSender();


export function memberProfile(app: Elysia) {
    return app.patch("/profile", async ({ status, params, body }) => {
        const { mid } = params as { mid: string };
        const data = body as any;
        console.log(data);
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
            return status(401, { error: "Unauthorized" });
        }
    }).patch("/profile/email", async ({ status, body, params }) => {
        const { email } = body as { email: string };
        const { mid } = params as { mid: string };
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
    })
}
