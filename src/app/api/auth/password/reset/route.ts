
import { db } from "@/db/db";
import { users } from "@/db/schemas";
import { MonstroData } from "@/libs/data";
import { EmailSender } from "@/libs/server/emails";
import { decodeId } from "@/libs/server/sqids";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/libs/server/redis";
import bcrypt from "bcryptjs";

const redis = getRedisClient();
const emailSender = new EmailSender();
export async function POST(req: NextRequest) {
    const { password, confirmPassword, ...rest } = await req.json()

    try {
        const [token, encodedUserId] = rest.token.split("%2B")
        const userId = decodeId(encodedUserId)
        if (password !== confirmPassword) {
            return NextResponse.json({ error: "Passwords do not match" }, { status: 400 })
        }

        const user = await db.query.users.findFirst({
            where: (user, { eq }) => eq(user.id, userId)
        })
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }
        const RedisKey = `reset:${user.id}`;


        const redisData = await redis.get(RedisKey)

        if (!redisData) {
            return NextResponse.json({ error: "Invalid token" }, { status: 400 })
        }
        const [redisToken, redisTimestamp] = redisData.toString().split("::")

        if (redisToken !== token) {
            return NextResponse.json({ error: "Invalid token" }, { status: 400 })
        }

        if (new Date(parseInt(redisTimestamp) * 1000).getTime() + 30 * 60 * 1000 < Date.now()) {
            return NextResponse.json({ error: "Token expired" }, { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        await db.update(users).set({
            password: hashedPassword
        }).where(eq(users.id, user.id))


        const [firstName, lastName] = user.name.split(" ")
        await emailSender.send({
            options: {
                to: user.email,
                subject: 'Password reset successful',
            },
            template: 'ResetSuccessEmail',
            data: {
                member: {
                    firstName,
                    lastName,
                    email: user.email
                },
                monstro: MonstroData
            }
        });
        await redis.del(RedisKey);
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ err }, { status: 500 })
    }
}