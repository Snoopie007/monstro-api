import { db } from "@/db/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRedisClient } from "@/libs/server/redis";
import { sendEmailViaApi } from "@/libs/server/emails";

const redis = getRedisClient();

const expiresAt = 60 * 30 + 30; // 30 minutes and 30 seconds

function generateResetToken() {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let token = '';
	for (let i = 0; i < 32; i++) {
		token += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return token;
}

export async function POST(req: NextRequest) {
	const { email } = await req.json()
	try {
		const user = await findUser(email)

		const RedisKey = `reset:${user.id}`;

		const exists = await redis.exists(RedisKey);
		const token = generateResetToken();

		if (!exists) {
			redis.set(RedisKey, `${token}::${Math.floor(Date.now() / 1000)}`, { ex: expiresAt })
			const [firstName, lastName] = user.name.split(" ")

			await sendEmailViaApi({
				recipient: user.email,
				template: 'ResetPasswordEmail',
				subject: 'Reset your password',
				data: {
					ui: {
						btnText: "Reset Password",
						btnUrl: `${req.nextUrl.origin}/login/reset/${token}+${user.id}`
					},
					member: {
						firstName,
						lastName,
						email
					}
				}
			});
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		return NextResponse.json({ message: (err as Error).message || "Something went wrong" }, { status: 500 })
	}
}

export async function PUT(req: NextRequest) {
	const { email } = await req.json()

	try {
		const user = await findUser(email)
		const RedisKey = `reset:${user.id}`;
		// Remove the old OTP
		await redis.del(RedisKey);

		// Generate a new OTP
		const token = generateResetToken();

		// Store the new OTP in Redis
		await redis.set(RedisKey, `${token}::${Math.floor(Date.now() / 1000)}`, { ex: expiresAt });

		const [firstName, lastName] = user.name.split(" ")

		await sendEmailViaApi({
			recipient: user.email,
			template: 'ResetPasswordEmail',
			subject: 'Reset your password',
			data: {
				member: {
					firstName,
					lastName,
					email
				},
				ui: {
					btnText: "Reset Password",
					btnUrl: `${req.nextUrl.origin}/login/reset/${token}+${user.id}`
				}
			}
		});

		return NextResponse.json({ success: true }, { status: 200 })
	} catch (error) {
		console.log(error)
		return NextResponse.json({ error }, { status: 500 })
	}
}

async function findUser(email: string) {
	const user = await db.query.users.findFirst({
		where: (user, { eq }) => eq(user.email, email),
		with: {
			vendor: true
		}
	})
	if (!user) {
		throw new Error("User not found")
	}
	if (!user.vendor) {
		throw new Error("This email is not associated with a vendor account.")
	}
	return user
}
