import { Elysia } from "elysia";
import { db } from "@/db/db";
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { generateMobileToken } from "@/libs/auth";
import { users, members, accounts } from "@/db/schemas";
import { generateReferralCode } from "@/libs/utils";
import { z } from "zod";
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));


const ApplAccountSchema = {
    body: z.object({
        token: z.string(),
        email: z.string(),
        name: z.string(),
        additionalData: z.object({
            migrateId: z.string().optional(),
            referralCode: z.string().optional(),
        }).optional(),
    }),
};


export async function mobileAppleLogin(app: Elysia) {


    app.post('/apple/new', async ({ body, status }) => {
        const { token, email, name } = body;

        if (!token) {
            return status(400, { message: "Id token is required" });
        }

        try {
            const decodedToken = await jwtVerify(token, APPLE_JWKS, {
                issuer: "https://appleid.apple.com",
                audience: process.env.APPLE_CLIENT_ID,
            });

            const { payload } = decodedToken;
            console.log(payload);

            const account = await db.query.accounts.findFirst({
                where: (account, { eq, and }) => and(
                    eq(account.accountId, `${payload.sub}`),
                    eq(account.provider, "apple")
                ),
                with: {
                    user: {
                        with: {
                            member: true
                        }
                    }
                },
            });

            let user = account?.user;

            if (!user) {
                user = await db.query.users.findFirst({
                    where: (user, { eq }) => eq(user.email, email),
                    with: {
                        member: true
                    },
                });
            }

            if (!user) {
                user = await db.transaction(async (tx) => {




                    const [newUser] = await tx.insert(users).values({
                        email,
                        name,
                    }).returning();

                    if (!newUser) {
                        tx.rollback();
                        return;
                    }

                    const [newAccount] = await tx.insert(accounts).values({
                        userId: newUser.id,
                        provider: "apple",
                        type: "oidc",
                        accountId: `${payload.sub}`,
                        expiresAt: payload.exp || null,
                        tokenType: "bearer",
                        scope: "openid",
                        idToken: token,
                    }).returning();
                    if (!newAccount) {
                        tx.rollback();
                        return;
                    }

                    const [newMember] = await tx.insert(members).values({
                        userId: newUser.id,
                        firstName: name.split(" ")[0] || "Unknown",
                        lastName: name.split(" ")[1] || "",
                        email: email,
                        phone: '',
                        referralCode: generateReferralCode(),
                    }).returning();

                    if (!newMember) {
                        tx.rollback();
                        return;
                    }

                    return {
                        ...newUser,
                        member: newMember
                    };
                });

            }

            if (!user) {
                return status(500, { message: "Failed to create or find user" });
            }

            // Check if account already exists to avoid duplicate key errors
            const existingAccount = await db.query.accounts.findFirst({
                where: (account, { eq, and }) => and(
                    eq(account.accountId, payload.sub as string),
                    eq(account.provider, "apple")
                )
            });



            const { member, image, ...rest } = user;

            if (!member) {
                return status(500, { message: "Member record not found" });
            }

            const data = {
                ...rest,
                phone: member.phone,
                image,
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
                setupCompleted: member.setupCompleted,
                expires: tokens.expires
            });
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return status(500, { message: errorMessage });
        }
    }, ApplAccountSchema);
    return app;
}