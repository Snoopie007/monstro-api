import { Elysia } from "elysia";
import { db } from "@/db/db";
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { generateMobileToken } from "@/libs/auth";
import { users, members, accounts } from "@/db/schemas";
import { generateReferralCode } from "@/libs/utils";
import { z } from "zod";
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));


const GoogleLoginSchema = {
    body: z.object({
        idToken: z.string(),
    }),
};

const GoogleNewAccountSchema = {
    body: z.object({
        token: z.string(),
        accessToken: z.string(),
        email: z.string(),
        name: z.string(),
        image: z.string().optional(),
        phone: z.string().optional(),
    }),
};


export async function mobileGoogleLogin(app: Elysia) {
    app.post('/google', async ({ body, status }) => {

        const { idToken } = body;

        if (!idToken) {
            return status(400, { message: "Id token is required" });

        }
        try {
            const decodedToken = await jwtVerify(idToken, GOOGLE_JWKS, {
                issuer: "https://accounts.google.com",
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const { payload } = decodedToken;
            const account = await db.query.accounts.findFirst({
                where: (account, { eq, and }) => and(
                    eq(account.accountId, `${payload.sub}`),
                    eq(account.provider, "google")
                )
            });

            if (!account) {
                return status(404, { message: "No Account" });

            }

            const user = await db.query.users.findFirst({
                where: (user, { eq }) => eq(user.id, account.userId!),
                with: {
                    member: true
                },
            });

            if (!user) {
                return status(404, { message: "No Account" });

            }

            const { password, member, ...rest } = user;
            const data = {
                ...rest,
                phone: member?.phone,
                image: member?.avatar,
                stripeCustomerId: member?.stripeCustomerId,
                memberId: member?.id,
                role: "member",
            };

            const { accessToken, refreshToken, expires } = await generateMobileToken({
                memberId: member.id,
                userId: user.id,
                email: user.email,
            });

            return status(200, { token: accessToken, refreshToken, user: data, expires });

        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return status(500, { message: errorMessage });

        }
    }, GoogleLoginSchema)

    app.post('/google/new', async ({ body, status }) => {
        const { token, accessToken, email, name, image, phone } = body;

        if (!token) {
            return status(400, { message: "Id token is required" });

        }

        try {
            const decodedToken = await jwtVerify(token, GOOGLE_JWKS, {
                issuer: "https://accounts.google.com",
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const { payload } = decodedToken;

            let user = await db.query.users.findFirst({
                where: (user, { eq }) => eq(user.email, payload.email as string),
                with: {
                    member: true
                },
            });

            if (!user) {
                const result = await db.transaction(async (tx) => {
                    const [newUser] = await tx.insert(users).values({
                        email,
                        name,
                        image: image || null,
                    }).returning();

                    if (!newUser) {
                        throw new Error("Failed to create user");
                    }

                    const [newMember] = await tx.insert(members).values({
                        userId: newUser.id,
                        firstName: name.split(" ")[0] || "Unknown",
                        lastName: name.split(" ")[1] || "",
                        email: email,
                        phone: phone || "",
                        referralCode: generateReferralCode(),
                    }).returning();

                    if (!newMember) {
                        throw new Error("Failed to create member");
                    }

                    return {
                        id: newUser.id,
                        name: newUser.name,
                        email: newUser.email,
                        emailVerified: newUser.emailVerified,
                        image: newUser.image,
                        password: newUser.password,
                        created: newUser.created,
                        updated: newUser.updated,
                        member: newMember
                    };
                });

                user = result;
            }

            if (!user) {
                return status(500, { message: "Failed to create or find user" });

            }

            // Check if account already exists to avoid duplicate key errors
            const existingAccount = await db.query.accounts.findFirst({
                where: (account, { eq, and }) => and(
                    eq(account.accountId, payload.sub as string),
                    eq(account.provider, "google")
                )
            });

            if (!existingAccount) {
                await db.insert(accounts).values({
                    userId: user.id,
                    provider: "google",
                    type: "oidc",
                    accountId: payload.sub as string,
                    accessToken: accessToken,
                    expiresAt: payload.exp?.toString() || null,
                    tokenType: "bearer",
                    scope: "openid",
                    idToken: token
                });
            }

            const { password, member, ...rest } = user;

            if (!member) {
                return status(500, { message: "Member record not found" });

            }

            const data = {
                ...rest,
                phone: member.phone,
                image: member.avatar,
                stripeCustomerId: member.stripeCustomerId,
                memberId: member.id,
                role: "member",
            };

            const tokens = await generateMobileToken({
                memberId: member.id,
                userId: user.id,
                email: user.email,
            });

            return status(200, {
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user: data,
                expires: tokens.expires
            });


        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return status(500, { message: errorMessage });
        }
    }, GoogleNewAccountSchema);
    return app;
}