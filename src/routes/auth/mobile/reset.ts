import { db } from "@/db/db";
import { EmailSender } from "@/libs/email";
import { getRedisClient } from "@/libs/redis";
import { generateOtp } from "@/utils/userUtils";
import { accounts } from "@subtrees/schemas";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

const expiresAt = 60 * 30 + 30; // 30 minutes and 30 seconds
const TOKEN_TTL_MS = 30 * 60 * 1000;

const emailSender = new EmailSender();
const redis = getRedisClient();

const ResetEmailBody = {
    body: t.Object({
        email: t.String({ format: "email" }),
    }),
};

const CompleteResetBody = {
    body: t.Object({
        email: t.String({ format: "email" }),
        code: t.String(),
        password: t.String({ minLength: 8 }),
        confirmPassword: t.String({ minLength: 8 }),
    }),
};

async function sendResetSuccessEmail(user: { name: string; email: string }) {
    const [firstName = "", lastName = ""] = user.name.split(" ");

    await emailSender.sendWithTemplate({
        options: {
            to: user.email,
            subject: "Password reset successful",
        },
        template: "ResetSuccessEmail",
        data: {
            member: {
                firstName,
                lastName,
                email: user.email,
            },
        },
    });
}

async function sendResetEmail(props: { name: string; email: string; code: string }) {
    const [firstName = "", lastName = ""] = props.name.split(" ");

    await emailSender.sendWithTemplate({
        options: {
            to: props.email,
            subject: "Reset your password",
        },
        template: "ResetPasswordEmailMobile",
        data: {
            code: props.code,
            member: {
                firstName,
                lastName,
                email: props.email,
            },
        },
    });
}

async function findUser(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.email, normalizedEmail),
    });

    if (!user) {
        throw new Error("User not found");
    }

    const account = await db.query.accounts.findFirst({
        where: (a, { and, eq }) => and(
            eq(a.userId, user.id),
            eq(a.provider, "credential"),
        ),
    });

    if (!account?.password) {
        throw new Error("No password account found for this email");
    }

    return user;
}

export async function mobileResetPassword(app: Elysia) {
    app.post("/forgot", async ({ body, status }) => {
        const { email } = body;

        try {
            const user = await findUser(email);
            const redisKey = `reset:${user.id}`;
            const exists = await redis.exists(redisKey);

            if (!exists) {
                const code = generateOtp();
                await redis.set(redisKey, `${code}::${Math.floor(Date.now() / 1000)}`, { ex: expiresAt });
                await sendResetEmail({
                    name: user.name,
                    email: 'steve00006@gmail.com',
                    code,
                });
            }

            return status(200, { success: true });
        } catch (err) {
            console.error(err);
            return status(500, {
                message: err instanceof Error ? err.message : "Something went wrong",
            });
        }
    }, ResetEmailBody);

    app.put("/forgot", async ({ body, status }) => {
        const { email } = body;

        try {
            const user = await findUser(email);
            const redisKey = `reset:${user.id}`;

            await redis.del(redisKey);

            const code = generateOtp();
            await redis.set(redisKey, `${code}::${Math.floor(Date.now() / 1000)}`, { ex: expiresAt });
            await sendResetEmail({
                name: user.name,
                email: user.email,
                code,
            });

            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, {
                error: error instanceof Error ? error.message : "Something went wrong",
            });
        }
    }, ResetEmailBody);

    app.post("/reset", async ({ body, status }) => {
        const { email, code, password, confirmPassword } = body;

        if (password !== confirmPassword) {
            return status(400, { error: "Passwords do not match" });
        }

        try {
            const user = await findUser(email);
            const redisKey = `reset:${user.id}`;
            const redisData = await redis.get(redisKey);

            if (!redisData) {
                return status(400, { error: "Invalid code" });
            }

            const [redisCode, redisTimestamp] = redisData.toString().split("::");

            if (!redisTimestamp || redisCode !== code) {
                return status(400, { error: "Invalid code" });
            }

            if (new Date(parseInt(redisTimestamp, 10) * 1000).getTime() + TOKEN_TTL_MS < Date.now()) {
                return status(400, { error: "Code expired" });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            await db.update(accounts).set({
                password: hashedPassword,
            }).where(and(
                eq(accounts.userId, user.id),
                eq(accounts.provider, "credential"),
            ));

            await sendResetSuccessEmail(user);
            await redis.del(redisKey);

            return status(200, { success: true });
        } catch (err) {
            console.error(err);
            return status(500, {
                error: err instanceof Error ? err.message : "Something went wrong",
            });
        }
    }, CompleteResetBody);

    return app;
}
