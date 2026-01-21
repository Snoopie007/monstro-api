import { db } from "@/db/db";
import { users, accounts } from "@/db/schemas";
import { sendEmailViaApi } from "@/libs/server/emails";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRedisClient } from "@/libs/server/redis";
import bcrypt from "bcryptjs";

const redis = getRedisClient();

export async function POST(req: NextRequest) {
  const { password, confirmPassword, ...rest } = await req.json();

  try {
    const [token, userId] = rest.token.split("%2B");
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.id, userId),
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const RedisKey = `reset:${user.id}`;

    const redisData = await redis.get(RedisKey);

    if (!redisData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    const [redisToken, redisTimestamp] = redisData.toString().split("::");

    if (redisToken !== token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    if (
      new Date(parseInt(redisTimestamp) * 1000).getTime() + 30 * 60 * 1000 <
      Date.now()
    ) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Update accounts table for Better Auth
    await db
      .update(accounts)
      .set({
        password: hashedPassword,
      })
      .where(
        and(
          eq(accounts.userId, user.id),
          eq(accounts.provider, "credential")
        )
      );

    const [firstName, lastName] = user.name.split(" ");
    await sendEmailViaApi({
      recipient: user.email,
      template: "ResetSuccessEmail",
      subject: "Password reset successful",
      data: {
        member: {
          firstName,
          lastName,
          email: user.email,
        }
      }
    });
    await redis.del(RedisKey);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ err }, { status: 500 });
  }
}
