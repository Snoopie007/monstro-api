import { Elysia } from "elysia";
import { db } from "@/db/db";
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { generateMobileToken } from "@/libs/auth";
import { users, members, accounts, importMembers } from "@/db/schemas";
import { generateReferralCode } from "@/libs/utils";
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
        console.log(additionalData)
        if (!token) {
            return status(400, { message: "Id token is required" });

        }

        try {
            const decodedToken = await jwtVerify<{ payload: GooglePayload }>(token, GOOGLE_JWKS, {
                issuer: "https://accounts.google.com",
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = decodedToken.payload;

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
                    where: (user, { eq }) => eq(user.email, payload.email as string),
                    with: {
                        member: true
                    },
                });
            }


            if (!account) {
                if (user) {
                    await db.insert(accounts).values({
                        userId: user.id,
                        provider: "google",
                        type: "oidc",
                        accountId: payload.sub as string,
                        accessToken: accessToken,
                        expiresAt: payload.exp || null,
                        tokenType: "bearer",
                        scope: "openid",
                        idToken: token
                    })

                } else {

                    const newUserData = {
                        email: payload.email as string,
                        name: payload.name as string,
                        image: payload.picture as string || null,
                        emailVerified: new Date(),
                    };

                    user = await db.transaction(async (tx) => {
                        const [newUser] = await tx.insert(users).values(newUserData).returning();
                        if (!newUser) {
                            tx.rollback();
                            return;
                        }
                        const [newAccount] = await tx.insert(accounts).values({
                            userId: newUser.id,
                            provider: "google",
                            type: "oidc",
                            accountId: payload.sub as string,
                            accessToken: accessToken,
                            expiresAt: payload.exp || null,
                            tokenType: "bearer",
                            scope: "openid",
                            idToken: token
                        }).returning();
                        if (!newAccount) {
                            tx.rollback();
                            return;
                        }

                        const nameParts = newUserData.name.split(" ");
                        const firstName = nameParts[0] || "Unknown";
                        const lastName = nameParts.length > 1 ? nameParts[1] : "";
                        const [newMember] = await tx.insert(members).values({
                            userId: newUser.id,
                            firstName: firstName,
                            lastName: lastName,
                            email: newUserData.email,
                            phone: "",
                            referralCode: generateReferralCode(),
                        }).returning();
                        if (!newMember) {
                            tx.rollback();
                            return;
                        }
                        return {
                            ...newUser,
                            member: newMember,
                        };
                    });

                }

            }

            if (!user) {
                return status(500, { message: "Failed to create or find user" });
            }


            const { member, ...rest } = user;

            if (additionalData?.migrateId) {
                await db.update(importMembers).set({
                    memberId: member.id,
                    status: "processing",
                }).where(eq(importMembers.id, additionalData.migrateId));
            }


            const data = {
                ...rest,
                phone: member.phone,
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
    }, GoogleAccountSchema);
    return app;
}