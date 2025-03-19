
import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/libs/server/redis";
import { EmailSender } from "@/libs/server/emails";
import { MonstroData } from "@/libs/data";
import { LoginTokenEmail } from "@/templates/emails";
import { generateOtp } from "@/libs/server/db";
import { TwilioClient } from "@/libs/server/twilio";
import LoginTokenSMS from "@/templates/sms/LoginTokenSMS";
const redis = getRedisClient();
const twilio = new TwilioClient();

const expiresAt = 60 * 30 + 30; // 30 minutes + 30 seconds

export async function POST(req: NextRequest) {
    const { type, user } = await req.json()

    try {

        const RedisKey = `loginToken:${user.id}:${type}`;

        const exists = await redis.exists(RedisKey);


        if (!exists) {
            const token = generateOtp();
            redis.set(RedisKey, `${token}::${Math.floor(Date.now() / 1000)}`, { ex: expiresAt })

            if (type === "email") {
                const emailSender = new EmailSender();
                await emailSender.send(user.email, 'Verify your email address', LoginTokenEmail, {
                    user,
                    otp: { token },
                    monstro: MonstroData
                });
            } else if (type === "sms") {
                await twilio.send(user.phone, LoginTokenSMS, {
                    otp: { token }
                });
            }

        }

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    const { type, user } = await req.json()
    const RedisKey = `loginToken:${user.id}:${type}`;

    try {
        // Remove the old OTP
        await redis.del(RedisKey);

        // Generate a new OTP
        const token = generateOtp();

        // Store the new OTP in Redis
        await redis.set(RedisKey, `${token}::${Math.floor(Date.now() / 1000)}`, { ex: expiresAt });

        if (type === "email") {
            const emailSender = new EmailSender();
            await emailSender.send(user.email, 'Verify your email address', LoginTokenEmail, {
                user,
                otp: { token },
                monstro: MonstroData
            });
        } else if (type === "sms") {
            await twilio.send(user.phone, LoginTokenSMS, {
                otp: { token }
            });
        }


    } catch (error) {
        console.log(error)
        return NextResponse.json({ error }, { status: 500 })
    }



    return NextResponse.json({ success: true }, { status: 200 })
}


