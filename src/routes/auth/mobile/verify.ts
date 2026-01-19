import { Elysia } from "elysia";
import { jwtVerify } from "jose";
import { z } from "zod";

const MobileVerifyTokenSchema = {
    body: z.object({
        token: z.string(),
    }),
};

/**
 * Verifies a mobile session token.
 * Returns 200 with decoded session info if valid, 
 * or 401 if invalid or expired.
 */
export async function verifySession(app: Elysia) {
    app.post('/verify', async ({ body, status }) => {
        const { token } = body;

        if (!token) {
            return status(400, { message: "Token is required" });
        }

        try {
            const authSecret = new TextEncoder().encode(process.env.AUTH_SECRET);
            const { payload } = await jwtVerify(token, authSecret);

            // Optionally, validate payload fields here (e.g. exp, memberId, etc)
            return status(200, { valid: true, session: payload });
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return status(401, { valid: false, message: errorMessage });
        }
    }, MobileVerifyTokenSchema);
    return app;
}
