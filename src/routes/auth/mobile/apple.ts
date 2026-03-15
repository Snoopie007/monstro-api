import { Elysia } from "elysia";
import { db } from "@/db/db";
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { generateMobileToken } from "@/libs/auth";
import { users, members, accounts } from "@subtrees/schemas";
import {
    MEMBER_AUTH_COLUMNS,
    USER_AUTH_COLUMNS,
    generateUsername, handleAdditionalData
} from "@/utils";
import { z } from "zod";
import { AuthAdditionalDataSchema } from "@/libs/schemas";
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));


const ApplAccountSchema = {
    body: z.object({
        token: z.string(),
        email: z.string().nullable().optional(),
        firstName: z.string().nullable().optional(),
        lastName: z.string().nullable().optional(),
        additionalData: AuthAdditionalDataSchema.optional(),
    }),
};

export async function mobileAppleLogin(app: Elysia) {


    app.post('/apple', async ({ body, status }) => {
        const { token, email, firstName, lastName, additionalData } = body;

        if (!token) {
            return status(400, { message: "Id token is required" });
        }

        try {
            const decodedToken = await jwtVerify(token, APPLE_JWKS, {
                issuer: "https://appleid.apple.com",
                audience: process.env.APPLE_CLIENT_ID,
            });

            const { payload } = decodedToken;

            const account = await db.query.accounts.findFirst({
                where: (account, { eq, and }) => and(
                    eq(account.accountId, `${payload.sub}`),
                    eq(account.provider, "apple")
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

            if (!account) {
                const randomFourDigits = Math.floor(Math.random() * 10000);
                const normalizedEmail = email ? email.trim().toLowerCase() : `temp-${randomFourDigits}@temp.com`;
                const failSafeFirstName = firstName ? firstName : `user-${randomFourDigits}`;
                const name = `${failSafeFirstName}${lastName ? ` ${lastName}` : ""}`;
                const username = generateUsername(name);
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
                    provider: "apple",
                    type: "oidc",
                    accountId: `${payload.sub}`,
                    expires: payload.exp ? new Date(payload.exp * 1000) : null,
                    tokenType: "bearer",
                    scope: "openid",
                    idToken: token
                }

                await db.transaction(async (tx) => {
                    if (!user) {
                        const [newUser] = await tx.insert(users).values({
                            email: normalizedEmail,
                            name: name,
                            username,
                            emailVerified: payload.email_verified as boolean || false,
                        }).returning({
                            id: users.id,
                            username: users.username,
                            discriminator: users.discriminator,
                            email: users.email,
                            emailVerified: users.emailVerified,
                            image: users.image,
                            isChild: users.isChild,
                        });
                        if (!newUser) {
                            tx.rollback();
                            return;
                        }
                        const [newMember] = await tx.insert(members).values({
                            userId: newUser.id,
                            firstName: failSafeFirstName,
                            lastName,
                            email: normalizedEmail,
                            referralCode: "TEMP",
                            familyInviteCode: "TEMP",
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

                    const [newAccount] = await tx.insert(accounts).values({
                        userId: user.id,
                        ...newAccountData
                    }).returning();
                    if (!newAccount) {
                        tx.rollback();
                        return;
                    }
                });
            }

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
    }, ApplAccountSchema);
    app.post('/apple/exising', async ({ body, status }) => {
        const { token, memberId } = body;
        if (!token) {
            return status(400, { message: "Token is required" });
        }
        const decodedToken = await jwtVerify(token, APPLE_JWKS, {
            issuer: "https://appleid.apple.com",
            audience: process.env.APPLE_CLIENT_ID,
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
            provider: "apple",
            type: "oidc",
            accountId: `${payload.sub}`,
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
        }),
    });
    return app;
}