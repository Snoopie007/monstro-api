import { db } from '@/db/db';
import bcrypt from 'bcryptjs';
import { customSession } from "better-auth/plugins";
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { toNextJsHandler } from "better-auth/next-js";
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
    plugins: [
      customSession(async ({user, session}) => {
        // Fetch vendor with their locations in a single optimized query
        const userWithVendor = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.id, user.id),
          columns: {
            id: true,
          },
          with: {
            vendor: {
              columns: {
                id: true,
              },
              with: {
                locations: {
                  columns: {
                    id: true,
                    name: true,
                  },
                  with: {
                    locationState: {
                      columns: {
                        status: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // Filter and map locations to only include active ones
        const filteredLocations = userWithVendor?.vendor?.locations
          .filter((location) => {
            const { locationState } = location;
            return locationState && ["active"].includes(locationState.status);
          })
          .map((location) => ({
            id: location.id,
            name: location.name,
            status: location.locationState?.status,
          })) || [];

        return {
          session: {
            ...session
          },
          user: {
            ...user,
            locations: filteredLocations,
          },
        }
      })
    ],

    // Add this to tell Better Auth that "provider" field is actually "providerId"
  account: {
    fields: {
      providerId: "provider",  // Map providerId to your provider column
    },
  },
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
    },
  });
  
  export const { GET, POST } = toNextJsHandler(auth);