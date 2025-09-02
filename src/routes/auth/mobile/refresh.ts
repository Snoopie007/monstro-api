import { generateMobileToken } from "@/libs/auth";
import { Elysia } from "elysia";
import { jwtVerify } from "jose";


export async function mobileRefreshToken(app: Elysia) {
    return app.post('/refresh', async ({ body, status }) => {
        const { token } = body as { token: string };

        if (!token) {
            return status(400, { message: "Refresh token is required" });
        }

        try {
            const authSecret = new TextEncoder().encode(process.env.AUTH_SECRET);
            const { payload } = await jwtVerify(token, authSecret);

            const { memberId, userId, email } = payload as { memberId: string, userId: string, email: string };
            const { accessToken, refreshToken, expires } = await generateMobileToken({
                memberId: memberId,
                userId: userId,
                email: email,
            });
            console.log(accessToken);
            return status(200, { token: accessToken, refreshToken, expires });
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return status(401, { message: errorMessage });
        }
    });
}

