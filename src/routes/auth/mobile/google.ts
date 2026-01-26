import { Elysia } from "elysia";
import { db } from "@/db/db";
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { generateMobileToken } from "@/libs/auth";
import { users, members, accounts, migrateMembers } from "@/db/schemas";
import { generateDiscriminator, generateReferralCode, generateUsername } from "@/libs/utils";
import { z } from "zod";
import { eq } from "drizzle-orm";
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));


const GoogleAccountSchema = {
    body: z.object({
        token: z.string(),
        accessToken: z.string(),
        additionalData: z.object({
            isRegister: z.boolean().optional().default(false),
            lid: z.string().optional(),
            migrateId: z.string().optional(),
            ref: z.string().optional(),
        }).optional(),
    }),
};


type GooglePayload = {
    email: string;
    name: string;
    picture: string;
    phone: string;
}

export async function mobileGoogleLogin(app: Elysia) {

    app.post('/google', async ({ body, status }) => {
        const { token, accessToken, additionalData } = body;

        if (!token) {
            return status(400, { message: "Id token is required" });

        }
        const today = new Date();
        try {
            const decodedToken = await jwtVerify<{ payload: GooglePayload }>(token, GOOGLE_JWKS, {
                issuer: "https://accounts.google.com",
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = decodedToken.payload;

            const normalizedEmail = `${payload.email}`.trim().toLowerCase();
            let account = await db.query.accounts.findFirst({
                where: (account, { eq, and }) => and(
                    eq(account.accountId, `${payload.sub}`),
                    eq(account.provider, "google")
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
                    where: (user, { eq }) => eq(user.email, normalizedEmail),
                    with: {
                        member: true
                    },
                });
            }

            const newAccountData = {
                provider: "google",
                type: "oidc",
                accountId: payload.sub as string,
                accessToken: accessToken,
                expires: payload.exp ? new Date(payload.exp * 1000) : null,
                tokenType: "bearer",
                scope: "openid",
                idToken: token
            }

            await db.transaction(async (tx) => {
                const name = payload.name as string;
                if (!user) {
                    const [newUser] = await tx.insert(users).values({
                        email: normalizedEmail,
                        name: name,
                        image: payload.picture as string,
                        username: generateUsername(name),
                        discriminator: generateDiscriminator(),
                        emailVerified: payload.email_verified as boolean || false,
                    }).onConflictDoUpdate({
                        target: [users.email],
                        set: {
                            image: payload.picture as string,
                        },
                    }).returning();
                    if (!newUser) {
                        tx.rollback();
                        return;
                    }
                    const [firstName, lastName] = name.split(" ");
                    const [newMember] = await tx.insert(members).values({
                        userId: newUser.id,
                        firstName: firstName || "",
                        lastName: lastName || "",
                        email: normalizedEmail,
                        referralCode: generateReferralCode(),
                    }).onConflictDoUpdate({
                        target: [members.email],
                        set: {
                            userId: newUser.id,
                        },
                    }).returning();
                    if (!newMember) {
                        tx.rollback();
                        return;
                    }
                    user = {
                        ...newUser,
                        member: newMember
                    };
                }

                if (!account) {
                    const [newAccount] = await tx.insert(accounts).values({
                        userId: user.id,
                        ...newAccountData
                    }).returning();
                    if (!newAccount) {
                        tx.rollback();
                        return;
                    }
                } else {
                    await tx.update(accounts).set({
                        userId: user.id,
                    }).where(eq(accounts.id, account.id));
                }
            });
            if (!user) {
                return status(500, { message: "Failed to create or find user" });
            }


            const { member, ...rest } = user;

            if (additionalData?.migrateId) {
                await db.update(migrateMembers).set({
                    memberId: member.id,
                    viewedOn: today,
                    updated: today,
                }).where(eq(migrateMembers.id, additionalData.migrateId));
            }


            const data = {
                ...rest,
                phone: member.phone,
                memberId: member.id,
                role: "member",
                referralCode: member.referralCode,
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
    }, GoogleAccountSchema);
    return app;
}