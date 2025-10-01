import type { ExtendedVendorUser } from '@/types/auth';
import { Elysia } from 'elysia';
import { jwtVerify } from 'jose';


async function verifyToken(token: string) {
    if (!process.env.SUPABASE_JWT_SECRET) {
        return null;
    }

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

async function verifyTokenX(token: string) {

    if (!process.env.SUPABASE_JWT_SECRET) {
        return null;
    }

    try {
        const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);

        const { payload } = await jwtVerify(token, secret, { clockTolerance: '999y' });
        const user = payload as ExtendedVendorUser;

        return { vendorId: user.vendorId };
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

export async function AuthXMiddleware(app: Elysia) {
    return app.derive(async ({ headers, status }) => {

        const auth = headers['authorization']

        if (!auth) return status(401, { error: "Unauthorized" })

        const token = auth.split(" ")[1];

        if (!token) return status(401, { error: "Unauthorized" })

        const result = await verifyTokenX(token);

        if (!result) return status(401, { error: "Unauthorized" })

        return { vendorId: result.vendorId }

    })
}