import type { ExtendedVendorUser } from '@subtrees/types/auth';
import { Elysia } from 'elysia';
import { errors, jwtVerify } from 'jose';

type MobileTokenReturnType = {
    ok: boolean;
    data: {
        mid: string | null;
        userId: string | null;
        isServiceRole: boolean;
    } | null;
    code: string;
}


async function verifyToken(token: string): Promise<MobileTokenReturnType> {
    if (!process.env.SUPABASE_JWT_SECRET) {
        return {
            ok: false,
            data: null,
            code: "SUPABASE_JWT_SECRET_NOT_SET",
        };
    }

    try {
        const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        // Check if this is a service role token (used for internal service-to-service calls)
        if (payload.role === 'service_role') {
            // Service role token - valid for internal operations
            return { ok: true, data: { mid: null, userId: null, isServiceRole: true }, code: "SUCCESS" };
        }

        // Regular user token
        const { user_metadata } = payload as { user_metadata: { member_id: string } };
        const userId = payload.sub as string; // Extract userId from sub field
        return { ok: true, data: { mid: user_metadata.member_id, userId, isServiceRole: false }, code: "SUCCESS" };
    } catch (error) {

        console.log("Token verification error", error);
        if (error instanceof errors.JWTExpired) {
            return { ok: false, data: null, code: "TOKEN_EXPIRED" };
        }
        return { ok: false, data: null, code: "TOKEN_VERIFICATION_FAILED" };
    }
}

type VendorTokenReturnType = {
    ok: boolean;
    data: {
        vendorId: string;
        userId: string;
    } | null;
    code: string;
}


async function verifyTokenX(token: string): Promise<VendorTokenReturnType> {

    if (!process.env.SUPABASE_JWT_SECRET) {
        return {
            ok: false,
            data: null,
            code: "SUPABASE_JWT_SECRET_NOT_SET",
        };
    }

    try {
        const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);

        const { payload } = await jwtVerify(token, secret, { clockTolerance: '999y' });
        const user = payload as ExtendedVendorUser;
        const userId = payload.sub as string; // Extract userId from sub field

        return {
            ok: true,
            data: {
                vendorId: user.vendorId,
                userId,
            },
            code: "SUCCESS",
        };
    } catch (error) {
        let data = {
            ok: false,
            data: null,
        }
        if (error instanceof errors.JWTExpired) {
            return {
                ...data,
                code: "TOKEN_EXPIRED",
            };
        }
        console.log("Token verification error", error);
        return {
            ...data,
            code: "TOKEN_VERIFICATION_FAILED",
        };
    };
}

export async function AuthMiddleware(app: Elysia) {
    return app.resolve(async ({ headers, status }) => {
        // Get token from Authorization header
        const auth = headers['authorization'];

        if (!auth) {
            console.log('AuthMiddleware: No Authorization header');
            return status(401, {
                message: "No token provided",
                code: "UNAUTHORIZED"
            });
        }

        const token = auth.split(" ")[1];

        if (!token) {
            console.log('AuthMiddleware: No token in Authorization header');
            return status(401, {
                message: "Invalid token format",
                code: "INVALID_TOKEN"
            });
        }

        const res = await verifyToken(token);

        if (!res.ok || !res.data) {
            console.log('AuthMiddleware: Token verification failed');
            return status(401, {
                message: "Unauthorized.",
                code: res.code
            });
        }
        const { mid, userId, isServiceRole } = res.data;

        return {
            memberId: mid,
            userId: userId,
            isServiceRole: isServiceRole
        };
    })
}

export async function AuthXMiddleware(app: Elysia) {
    return app.resolve(async ({ headers, status }) => {

        const auth = headers['authorization']

        const error = {
            message: "Unauthorized",
            code: "UNAUTHORIZED"
        }
        if (!auth) return status(401, error);

        const token = auth.split(" ")[1];

        if (!token) return status(401, error);

        const res = await verifyTokenX(token);

        if (!res.ok || !res.data) {
            return status(401, {
                message: "Unauthorized",
                code: res.code
            });
        };

        const { vendorId, userId } = res.data;

        return { vendorId: vendorId, userId: userId };

    })
}