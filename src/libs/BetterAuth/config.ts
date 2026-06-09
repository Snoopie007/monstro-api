import { betterAuth } from "better-auth";
import { getOAuthState, APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession } from "better-auth/plugins";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { users } from "subtrees/schemas";
import { accounts } from "subtrees/schemas";
import { sessions } from "subtrees/schemas";
import { verifications } from "subtrees/schemas";
import { members } from "subtrees/schemas";
import bcrypt from "bcryptjs";
import { generateUsername } from "@/utils/userUtils";
import { generateAppleClientSecret } from "./apple";
import { sessionBridge } from "./plugins";
import { resolveTrustedOrigins } from "./trustedOrigins";
// Use secure cookies if we're on HTTPS (production, preview, or ngrok)
const isProduction = Bun.env.BUN_ENV === "production";
const isPreview = Bun.env.BUN_ENV === "preview";
const baseURL = Bun.env.BETTER_AUTH_BASE_URL ?? "http://localhost:3001";

const useSecureCookies = isProduction || isPreview || baseURL.startsWith("https://");

console.log("baseURL", baseURL);


// Generate Apple secret at startup (will be refreshed on each deploy/restart)
const appleClientSecret = await generateAppleClientSecret();

export const auth = betterAuth({
    baseURL: baseURL,
    basePath: "/web/auth",
    trustedOrigins: async (request) => resolveTrustedOrigins(baseURL, request),
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: users,
            account: accounts,
            session: sessions,
            verification: verifications,
            members: members,
        },
    }),
    account: {
        fields: {
            providerId: "provider",
            createdAt: 'created',
            updatedAt: 'updated',
        },
    },
    user: {
        fields: {
            createdAt: 'created',
            updatedAt: 'updated',
        },
        additionalFields: {
            username: {
                type: "string",
                required: true,
            },
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            mapProfileToUser: (profile) => {
                return {
                    username: generateUsername(profile.name),
                };
            },
        },
        apple: {
            clientId: process.env.AUTH_APPLE_ID!,
            clientSecret: appleClientSecret, // Use dynamically generated secret
            scope: ["name", "email"],
            mapProfileToUser: (profile) => {
                const name = profile.name || Math.random().toString(36).substring(2, 8);
                return {
                    username: generateUsername(name),
                };
            },
        },
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user, ctx) => {
                    if (!ctx || !ctx.path || ctx.path !== "/callback/:id") {
                        return { data: user };
                    }
                    // Get additional data from OAuth state
                    const oauthState = await getOAuthState();
                    if (!oauthState?.memberId) {
                        return { data: user }; // No userId passed, proceed with normal creation
                    }

                    const targetMemberId = oauthState.memberId;


                    // Check if the existing member exists
                    const existingMember = await db.query.members.findFirst({
                        where: (members, { eq }) => eq(members.id, targetMemberId),
                        columns: {
                            id: true,
                            userId: true,
                        }
                    });
                    if (!existingMember) {
                        return { data: user };
                    }


                    // CRITICAL: Return `false` to prevent the new user from being created
                    // Then manually create the account linked to the existing user
                    const accountData = {
                        userId: existingMember.userId,
                        providerId: ctx.body?.provider,
                        // These come from the OAuth profile - access via ctx or internal state
                        accountId: ctx.body?.accountId || ctx.context.oauthProfile?.sub,
                        accessToken: ctx.body?.accessToken,
                        refreshToken: ctx.body?.refreshToken,
                        // ... other account fields
                    };
                    // Create the account for the existing user
                    await ctx.context.internalAdapter.createAccount(accountData);
                    // Option 2: Return the existing user data 
                    // (if Better Auth uses this for session creation)
                    return { data: user };
                },
                after: async (user, ctx) => {
                    try {

                        const nameParts = (user.name || "").split(" ");
                        const firstName = nameParts[0] || "Unknown";
                        const lastName = nameParts.slice(1).join(" ") || "";

                        const [member] = await db.insert(members).values({
                            userId: user.id,
                            firstName,
                            lastName,
                            email: user.email,
                            phone: "",  // Required - filled during setup
                            setupCompleted: false,
                        }).onConflictDoUpdate({
                            target: [members.userId],
                            set: {
                                userId: user.id,
                                email: user.email,
                            },
                        }).returning({
                            id: members.id,
                        });


                        if (member && ctx && ctx.path === "/callback/:id") {
                            const additionalData = await getOAuthState();
                            if (additionalData?.locationId) { }
                        }


                    } catch (error) {
                        console.error(error);
                        await db.delete(users).where(eq(users.id, user.id));
                    }
                },
            },
        },
    },

    emailAndPassword: {
        enabled: true,

        password: {
            hash: async (password: string) => {
                return bcrypt.hash(password, 10);
            },
            verify: async ({ hash, password }: { hash: string; password: string }) => {
                console.log("Verifying password", password, hash);
                return bcrypt.compare(password, hash);
            },
        },
    },
    session: {
        expiresIn: 60 * 60 * 24 * 365, // 1 year
        updateAge: 60 * 60, // Update every hour
    },

    advanced: {
        useSecureCookies,
        cookiePrefix: "mxw",
        database: {
            generateId: false, // "serial" for auto-incrementing numeric IDs
        },
    },

    secret: Bun.env.AUTH_SECRET,
    plugins: [
        sessionBridge(),
        customSession(async ({ user, session }) => {

            const userData = await db.query.users.findFirst({
                where: (users, { eq }) => eq(users.id, user.id),
                with: {
                    member: {
                        columns: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
            });


            if (!userData) {
                throw new APIError("BAD_REQUEST", {
                    message: "User not found",
                });
            }

            const { member, ...rest } = userData;
            if (!member) {
                throw new APIError("BAD_REQUEST", {
                    message: "User not found",
                });
            }


            return {
                session: {
                    ...session,
                },
                user: {
                    ...rest,
                    memberId: member?.id,
                    email: member?.email,
                    firstName: member?.firstName,
                    lastName: member?.lastName,
                    phone: member?.phone,
                },
            };
        }),
    ],
});
