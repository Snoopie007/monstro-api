import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { getRedisClient } from "@/libs/server/redis";
import { isAfter } from "date-fns";

async function validateToken(token: string, userId: string, type: string) {
  const redis = getRedisClient();
  const RedisKey = `loginToken:${userId}:${type}`;
  const otp = await redis.get(RedisKey);
  const [storedToken, time] = otp?.toString().split("::") || [];

  if (!otp || storedToken !== token) {
    throw new Error("Invalid token");
  }

  const thirtyMinutesInMs = 30 * 60 * 1000;
  const tokenExpired = isAfter(
    new Date(),
    new Date(parseInt(time) * 1000 + thirtyMinutesInMs)
  );

  await redis.del(RedisKey);

  if (tokenExpired) {
    throw new Error("Token expired");
  }

  return true;
}

/**
 * Verify OTP token endpoint
 * Only validates the OTP token - does not authenticate the user
 */
export async function POST(req: NextRequest) {
  try {
    const { email, token, type } = await req.json();
    const normalizedEmail = email.toLowerCase();
    // 1. Find user by email
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, normalizedEmail),
      columns: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 2. Validate OTP token
    try {
      await validateToken(token, user.id, type || "email");
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    // 3. Return success - token is valid
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}

