import { Elysia } from "elysia";
import { db } from "@/db/db";
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { generateMobileToken } from "@/libs/auth";
import { users, members, accounts } from "@subtrees/schemas";
import {
    USER_AUTH_COLUMNS,
    MEMBER_AUTH_COLUMNS,
    generateUsername, handleAdditionalData
} from "@/utils";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { AuthAdditionalDataSchema } from "@/libs/schemas";
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));


const GoogleAccountSchema = {
    body: z.object({
        token: z.string(),
        accessToken: z.string(),
        additionalData: AuthAdditionalDataSchema.optional(),
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
                        columns: USER_AUTH_COLUMNS,
                        with: {
                            member: {
                                columns: MEMBER_AUTH_COLUMNS
                            }
                        }
                    }
                },
            });


            let user = account?.user;
            if (!user) {
                user = await db.query.users.findFirst({
                    where: (user, { eq }) => eq(user.email, normalizedEmail),
                    columns: USER_AUTH_COLUMNS,
                    with: {
                        member: {
                            columns: MEMBER_AUTH_COLUMNS
                        }
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
                        emailVerified: payload.email_verified as boolean || false,
                    }).onConflictDoUpdate({
                        target: [users.email],
                        set: { image: payload.picture as string },
                    }).returning({
                        id: users.id,
                        username: users.username,
                        discriminator: users.discriminator,
                        email: users.email,
                        image: users.image,
                        isChild: users.isChild,
                    });
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
                    }).onConflictDoUpdate({
                        target: [members.email],
                        set: { userId: newUser.id },
                    }).returning({
                        id: members.id,
                        email: members.email,
                        firstName: members.firstName,
                        lastName: members.lastName,
                        setupCompleted: members.setupCompleted,
                        phone: members.phone,
                        referralCode: members.referralCode,
                        familyInviteCode: members.familyInviteCode,
                    });
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
                return status(500, { message: "User not found" });
            }

            if (!user.member) {
                return status(500, { message: "Member not found" });
            }

            const { member, ...rest } = user;

            if (additionalData) {
                handleAdditionalData(additionalData, member.id);
            }


            const data = {
                ...member,
                memberId: member.id,
                id: rest.id,
                image: rest.image,
                discriminator: rest.discriminator,
                username: rest.username,
                isChild: rest.isChild,
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
    app.post('/google/existing', async ({ body, status }) => {
        const { token, memberId, accessToken } = body;
        if (!token) {
            return status(400, { message: "Token is required" });
        }
        const decodedToken = await jwtVerify(token, GOOGLE_JWKS, {
            issuer: "https://accounts.google.com",
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { payload } = decodedToken;
        const existingMember = await db.query.members.findFirst({
            where: (member, { eq }) => eq(member.id, memberId),
            columns: {
                id: true,
                userId: true,
            },
        });
        if (!existingMember) {
            return status(400, { message: "Member not found" });
        }
        await db.insert(accounts).values({
            userId: existingMember.userId,
            provider: "google",
            type: "oidc",
            accountId: `${payload.sub}`,
            accessToken: accessToken,
            expires: payload.exp ? new Date(payload.exp * 1000) : null,
            tokenType: "bearer",
            scope: "openid",
            idToken: token
        })
        return status(200, { success: true });
    }, {
        body: z.object({
            token: z.string(),
            memberId: z.string(),
            accessToken: z.string(),
        }),
    });
    return app;
}