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
        // Check if this is a service role token (used for internal service-to-service calls)
        if (payload.role === 'service_role') {
            // Service role token - valid for internal operations
            return { mid: 'service', userId: null, isServiceRole: true };
        }
        
        // Regular user token
        const { user_metadata } = payload as { user_metadata: { member_id: string } };
        const userId = payload.sub as string; // Extract userId from sub field
        return { mid: user_metadata.member_id, userId, isServiceRole: false };
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
        // Get token from Authorization header
        const auth = headers['authorization'];
        
        if (!auth) {
            console.log('AuthMiddleware: No Authorization header');
            return status(401, { error: "Unauthorized - No token provided" });
        }

        const token = auth.split(" ")[1];

        if (!token) {
            console.log('AuthMiddleware: No token in Authorization header');
            return status(401, { error: "Unauthorized - Invalid token format" });
        }

        const result = await verifyToken(token);

        if (!result) {
            console.log('AuthMiddleware: Token verification failed');
            return status(401, { error: "Unauthorized - Invalid token" });
        }

        return { 
            memberId: result.mid,
            userId: result.userId,
            isServiceRole: result.isServiceRole 
        }
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