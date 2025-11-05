import { db } from '@/db/db';
import bcrypt from 'bcryptjs';
import {betterAuth} from 'better-auth';
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { toNextJsHandler } from "better-auth/next-js";
import { signSupabaseJWT } from '../server/supabase-jwt';
import { buildUserPayload } from './UserContext';
import { accounts, users } from '@/db/schemas';

const isProduction = process.env.NODE_ENV === "production";
const isPreview = process.env.VERCEL_ENV === "preview";
export const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: users,
        account: accounts,
        // session: -,
      },
    //   singularTableNames: true, 
    }),

    user: {
        modelName: "users", // Your table name
        fields: {
          email: "email",
          emailVerified: "emailVerified", // Maps to email_verified_at in DB
          name: "name",
          image: "image",
          createdAt: "created", // Your column is "created_at"
          updatedAt: "updated", // Your column is "updated_at"
        },
        // Add additional fields you want in the user object
        additionalFields: {
          // These will be available in session.user
          phone: { type: "string", required: false },
          role: { type: "string", required: false },
          vendorId: { type: "number", required: false },
          staffId: { type: "number", required: false },
          stripeCustomerId: { type: "string", required: false },
          sbToken: { type: "string", required: false },
          locations: { type: "string", required: false }, // JSON string
        },
      },
  
    emailAndPassword: {
      enabled: true,
      // Custom password validation happens here
      async handleSignIn(email: string, password: string) {
        const user = await db.query.users.findFirst({
          where: (user, { eq }) => eq(user.email, email),
          columns: {
            id: true,
            email: true,
            name: true,
            password: true,
          },
        });
  
        if (!user || !user.password) {
          throw new Error("User not found");
        }
  
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          throw new Error("Invalid credentials");
        }
  
        // Return basic user info
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    },
  
    session: {
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
      // AFTER hooks - run after endpoint execution
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
            // Get the user ID from the response
            // TODO: refine type
            const userId = returnedUser?.id;
            
            if (userId) {
              // TODO: REFACTOR - Don't fetch all this data at login
              // Just validate credentials and return user ID
              const userPayload = await buildUserPayload(userId);
  
              // Return modified response with full user data
              return {
                ...(returned as Record<string,any>),
                user: {
                  ...returnedUser,
                  ...userPayload,
                },
              };
            }
          } catch (error) {
            console.error("Error building user payload:", error);
            // Return original response if enrichment fails
            return returned;
          }
        }
  
        // For all other endpoints, return as-is
        return returned;
      }),
  
      // BEFORE hooks - run before endpoint execution (optional)
      before: createAuthMiddleware(async (ctx) => {
        // You can add pre-processing logic here if needed
        // For example, rate limiting, custom validation, etc.
        
        if (ctx.path === "/sign-in/email") {
          // Custom logic before sign-in
          console.log("Sign-in attempt:", ctx.body);
        }
  
        // Must return ctx to continue
        return ctx;
      }),
    },
  });
  
  export const { GET, POST } = toNextJsHandler(auth);