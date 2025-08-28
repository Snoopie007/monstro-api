import { Elysia } from "elysia";
import { db } from "@/db/db";
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { generateMobileToken } from "@/libs/auth";
import { users, members, accounts } from "@/db/schemas";
import { generateReferralCode } from "@/libs/utils";

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

type AppleLoginBody = {
    idToken: string;
}

type AppleNewAccountBody = {
    token: string;
    email: string;
    name: string;
    phone?: string;
}

export async function mobileAppleLogin(app: Elysia) {
    return app.post('/apple', async ({ body, set }) => {
        const { idToken } = JSON.parse(body as string) as AppleLoginBody;

        if (!idToken) {
            set.status = 400;
            return { message: "Id token is required" };
        }

        try {
            const decodedToken = await jwtVerify(idToken, APPLE_JWKS, {
                issuer: "https://appleid.apple.com",
                audience: process.env.APPLE_CLIENT_ID,
            });

            const { payload } = decodedToken;
            const account = await db.query.accounts.findFirst({
                where: (account, { eq, and }) => and(
                    eq(account.providerAccountId, `${payload.sub}`),
                    eq(account.provider, "apple")
                )
            });

            if (!account) {
                set.status = 404;
                return { message: "No Account" };
            }

            const user = await db.query.users.findFirst({
                where: (user, { eq }) => eq(user.id, account.userId!),
                with: {
                    member: true
                },
            });

            if (!user) {
                set.status = 404;
                return { message: "No Account" };
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

            set.status = 200;
            return { token: accessToken, refreshToken, user: data, expires };
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            set.status = 500;
            return { message: errorMessage };
        }
    })
        .post('/apple/new', async ({ body, status }) => {
            const { token, email, name, phone } = JSON.parse(body as string) as AppleNewAccountBody;

            if (!token) {
                return status(400, { message: "Id token is required" });
            }

            try {
                const decodedToken = await jwtVerify(token, APPLE_JWKS, {
                    issuer: "https://appleid.apple.com",
                    audience: process.env.APPLE_CLIENT_ID,
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
                            image: null, // Apple doesn't provide profile pictures
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
                            avatar: null,
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
                        eq(account.providerAccountId, payload.sub as string),
                        eq(account.provider, "apple")
                    )
                });

                if (!existingAccount) {
                    await db.insert(accounts).values({
                        provider: "apple",
                        type: "oidc",
                        providerAccountId: payload.sub as string,
                        userId: user.id,
                        access_token: null, // Apple doesn't provide access tokens in the same way
                        expires_at: payload.exp,
                        token_type: "bearer",
                        scope: "openid",
                        id_token: token
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
        });
}