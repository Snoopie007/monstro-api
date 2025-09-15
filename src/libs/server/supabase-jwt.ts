import { SignJWT } from "jose";

/**
 * Signs a JWT token using Supabase JWT secret for authenticated API access
 * @param payload - The user data to include in the JWT
 * @param userId - The user ID to include in the sub claim
 * @returns Promise<string> - The signed JWT token
 */
export async function signSupabaseJWT(
  payload: {
    id: string;
    email: string;
    role: string;
    [key: string]: any;
  },
  userId: string
): Promise<string> {
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!supabaseJwtSecret) {
    throw new Error("SUPABASE_JWT_SECRET environment variable is required");
  }

  const secret = new TextEncoder().encode(supabaseJwtSecret);

  // Create JWT payload following Supabase conventions
  const jwtPayload = {
    sub: userId,
    email: payload.email,
    user_metadata: {
      name: payload.name,
      email: payload.email,
    },
    app_metadata: {
      provider: "credentials",
      providers: ["credentials"],
    },
    aud: "authenticated",
    role: "authenticated",
    // Add custom claims for your application
    vendorId: payload.vendorId,
    staffId: payload.staffId,
    userRole: payload.role,
  };

  const jwt = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("24h") // Match Supabase default
    .setIssuer(process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321")
    .setAudience("authenticated")
    .sign(secret);

  return jwt;
}
