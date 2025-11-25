import { SignJWT } from "jose";

type MobileToken = {
    accessToken: string;
    refreshToken: string;
    expires: number;
}

type TokenPayload = {
    memberId: string;
    userId: string;
    email: string;
}

export async function generateMobileToken(m: TokenPayload): Promise<MobileToken> {
    if (!process.env.SUPABASE_JWT_SECRET) {
        throw new Error("SUPABASE_JWT_SECRET is not set");
    }
    if (!process.env.AUTH_SECRET) {
        throw new Error("AUTH_SECRET is not set");
    }



    const supabaseSecret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
    const authSecret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const now = Math.floor(Date.now() / 1000);
    const expires = now + 24 * 60 * 60;
    const refreshTokenExpires = now + 30 * 24 * 60 * 60;
    const supabasePayload = {
        aud: "authenticated", // Required: audience
        exp: expires, // Required: expiration (1 day)
        iat: now, // Required: issued at
        sub: m.userId, // Required: subject (user ID)
        role: "authenticated", // Required: Supabase role
        email: m.email || "",
        user_metadata: {
            member_id: m.memberId,
            role: "member"
        },
    };

    const refreshToken = await new SignJWT({
        memberId: m.memberId,
        userId: m.userId,
        email: m.email,
        expires: refreshTokenExpires,
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).sign(authSecret);

    const accessToken = await new SignJWT(supabasePayload)
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(process.env.SUPABASE_URL || "http://localhost:54321")  // ← Add this line!
        .sign(supabaseSecret);

    return { accessToken, refreshToken, expires };
}