import { db } from '@/db/db';
import bcrypt from 'bcryptjs';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { toNextJsHandler } from "better-auth/next-js";
import { buildUserPayload } from './UserContext';
import { accounts, users, sessions } from '@/db/schemas';

const isProduction = process.env.NODE_ENV === "production";
const isPreview = process.env.VERCEL_ENV === "preview";
export const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: users,
        account: accounts,
        session: sessions,
      },
    }),

    // Add this to tell Better Auth that "provider" field is actually "providerId"
  account: {
    fields: {
      providerId: "provider",  // Map providerId to your provider column
    },
  },

    // Note: When passing schema directly to drizzleAdapter,
    // you don't need user.modelName or user.fields configuration
    // The adapter reads the structure from the Drizzle schema
    
    // // Add additional fields you want in the user object
    // user: {
    //   additionalFields: {
    //     // These will be available in session.user
    //     phone: { type: "string", required: false },
    //     role: { type: "string", required: false },
    //     vendorId: { type: "number", required: false },
    //     staffId: { type: "number", required: false },
    //     stripeCustomerId: { type: "string", required: false },
    //     sbToken: { type: "string", required: false },
    //     locations: { type: "string", required: false }, // JSON string
    //   },
    // },
    emailAndPassword: {
      enabled: true,
      // Custom password verification
      password: {
        hash: async (password: string) => {
          return bcrypt.hash(password, 10);
        },

        verify: async ({ hash, password }: { hash: string; password: string }) => {
          return bcrypt.compare(password, hash);
        },
      }
    },
  
    session: {
      // Note: Field mappings are handled by the Drizzle schema
      expiresIn: 60 * 60 * 24, // 1 day
      updateAge: 60 * 60, // Update every hour
    },
  
    advanced: {
      useSecureCookies: isProduction,
      cookiePrefix: "monstro",
  
      crossSubDomainCookies: {
        enabled: true,
        domain: isProduction
          ? ".monstro-x.com"
          : isPreview
          ? ".monstrox.vercel.app"
          : undefined,
      },
    },
  
    trustedOrigins: [
      "https://monstro-x.com",
      "https://*.monstro-x.com",
      isPreview && "https://*.monstrox.vercel.app",
    ].filter(Boolean) as string[],
  
    hooks: {
      // BEFORE hooks - handle existing users without account records
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-in/email") {
          const { email, password } = ctx.body;
          // Check if user exists in users table
          const user = await db.query.users.findFirst({
            where: (user, { eq }) => eq(user.email, email),
            columns: {
              id: true,
              email: true,
              password: true,
            },
          });

          
          if (user && user.password) {
            // User exists with password, check if they have an account record
            const existingAccount = await db.query.accounts.findFirst({
              where: (account, { eq, and }) => 
                and(
                  eq(account.userId, user.id),
                  eq(account.provider, "credential")
                ),
              columns: {
                provider: true,
                accountId: true,
                userId: true,
              },
            });

            
            if (!existingAccount) {
              // User exists but no account record - create one for backwards compatibility
              // This handles migrated users from Next-Auth
              const match = await bcrypt.compare(password, user.password);

              if (match) {
                // Create credential account record
                await db.insert(accounts).values({
                  userId: user.id,
                  type: "email" as any, // Type for email/password accounts
                  provider: "credential",
                  accountId: user.email, // Use user ID as account ID for credentials
                  password: user.password
                });
              }
            }
          }
        }
        
        return ctx;
      }),
      
      // AFTER hooks - enrich user data after sign-in
      after: createAuthMiddleware(async (ctx) => {
        const returned = ctx.context.returned;
        // Handle errors
        if (returned instanceof APIError) {
          return returned;
        }
  
        // Check if this is the sign-in endpoint
        if (ctx.path === "/sign-in/email") {
          try {
            const returnedUser = (returned && (returned as Record<string,any>).user);
            const userId = returnedUser?.id;
            
            if (userId) {
              // TODO: REFACTOR - Don't fetch all this data at login
              const userPayload = await buildUserPayload(userId);
              const enrichedSession = {
                ...(returned as Record<string,any>),
                user: {
                  ...returnedUser,
                  ...userPayload,
                },
              }

              console.log('enriched session: ', enrichedSession)
  
              // Return modified response with full user data
              return enrichedSession;
            }
          } catch (error) {
            console.error("Error building user payload:", error);
            return returned;
          }
        }
  
        return returned;
      }),
    },
  });
  
  export const { GET, POST } = toNextJsHandler(auth);