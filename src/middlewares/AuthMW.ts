import type { ExtendedUser } from '@/types/auth';
import { Elysia } from 'elysia';
import { jwtVerify } from 'jose';


async function verifyToken(token: string) {
    try {
        const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        const { user_metadata } = payload as { user_metadata: { member_id: string } };
        return { mid: user_metadata.member_id };
    } catch (error) {
        console.log("Token verification error", error);
        return null;
    }
}



export async function AuthMiddleware(app: Elysia) {
    return app.derive(async ({ headers, status }) => {
        const auth = headers['authorization']

        if (!auth) return status(401, { error: "Unauthorized" })

        const token = auth.split(" ")[1];

        if (!token) return status(401, { error: "Unauthorized" })

        const result = await verifyToken(token);

        if (!result) return status(401, { error: "Unauthorized" })

        return { memberId: result.mid }
    })

}

