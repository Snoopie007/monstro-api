import { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { getRedisClient } from "./libs/server/redis";
import { isAfter } from "date-fns";
import { signSupabaseJWT } from "./libs/server/supabase-jwt";

class CustomLoginError extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
    this.message = code;
    this.stack = undefined;
  }
}

async function validateToken(t: string, uid: string, type: string) {
  const redis = getRedisClient();
  const RedisKey = `loginToken:${uid}:${type}`;
  const otp = await redis.get(RedisKey);
  const [token, time] = otp?.toString().split("::") || [];

  // Check if the token is expired (more than 30 minutes old)

  if (!otp || token !== t) {
    throw new CustomLoginError("Invalid token");
  }

  const thirtyMinutesInMs = 30 * 60 * 1000;
  const tokenExpired = isAfter(
    new Date(),
    new Date(parseInt(time) * 1000 + thirtyMinutesInMs)
  );

  await redis.del(RedisKey);
  if (tokenExpired) {
    throw new CustomLoginError("Token expired");
  }
}

export default {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "text" },
        type: { label: "Type", type: "text" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Lazy-load the database only when this code runs on the server runtime.
          // This avoids importing Node-only modules in the Edge runtime (middleware).
          const { db } = await import("./db/db");
          const user = await db.query.users.findFirst({
            where: (user, { eq }) => eq(user.email, `${credentials.email}`),
            with: {
              vendor: {
                columns: {
                  id: true,
                  phone: true,
                  avatar: true,
                  stripeCustomerId: true,
                },
                with: {
                  locations: {
                    with: {
                      locationState: {
                        columns: {
                          status: true,
                        },
                      },
                    },
                    columns: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          });

          if (!user || !user.password)
            throw new CustomLoginError("No user found");

          if (!user) throw new CustomLoginError("User not found");

          const match = await bcrypt.compare(
            credentials.password as string,
            user.password
          );
          if (!match) throw new CustomLoginError("Invalid password or email.");
          if (credentials.token && credentials.type) {
            await validateToken(
              credentials.token.toString(),
              user.id,
              credentials.type.toString()
            );
          }
          // Create a JWT token
          const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
          const jwt = await new SignJWT(user)
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("1d")
            .setIssuedAt()
            .sign(secret);

          const {
            vendor: { locations, ...vendor },
            ...rest
          } = user;
          const encodedLocations = locations.map((location) => {
            const { locationState, ...restData } = location;
            return {
              ...restData,
              status: locationState ? locationState.status : "incomplete",
            };
          });

          // Create Supabase JWT token
          const userPayload = {
            id: rest.id.toString(),
            name: rest.name,
            email: rest.email,
            role: "vendor",
            vendorId: vendor?.id || 0,
            staffId: 0,
          };
          const sbToken = await signSupabaseJWT(
            userPayload,
            rest.id.toString()
          );

          return {
            id: rest.id.toString(),
            name: rest.name,
            email: rest.email,
            phone: vendor.phone,
            image: vendor?.avatar,
            vendorId: vendor?.id,
            vendorPhone: vendor?.phone,
            stripeCustomerId: vendor?.stripeCustomerId,
            role: "vendor",
            token: jwt,
            sbToken: sbToken,
            locations: encodedLocations,
          };
        } catch (error) {
          console.log(error);
          if (error instanceof CustomLoginError) {
            throw error;
          }
          throw new CustomLoginError("Invalid password or email.");
        }
      },
    }),
  ],
} satisfies NextAuthConfig;
