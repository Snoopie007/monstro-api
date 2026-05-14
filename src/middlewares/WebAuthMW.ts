
import { Elysia } from 'elysia';
import { auth } from '@/libs/BetterAuth/config';




const WEB_AUTH_SCOPES = [
    'user.read',

]



export async function WebAuthMiddleware(app: Elysia) {
    return app.resolve(async ({ headers, status }) => {
        console.log("headers", headers);
        // Get token from Authorization header
        const lid = headers['locationid'];
        const authorization = headers['authorization'];


        if (!lid) {
            console.log('AuthMiddleware: No Location ID header');
            return status(401, {
                message: "No Location ID provided",
                code: "UNAUTHORIZED"
            });
        }

        if (!authorization) {
            console.log('AuthMiddleware: No Authorization header');
            return status(401, {
                message: "No token provided",
                code: "UNAUTHORIZED"
            });
        }

        const [_, token] = authorization.split(" ");


        if (_ !== 'Bearer' || !token) {
            console.log('AuthMiddleware: No token in Authorization header');
            return status(401, {
                message: "Invalid token format",
                code: "INVALID_TOKEN"
            });
        }

        console.log("location id", lid);
        const session = await auth.api.getSession({
            headers
        });
        console.log("session", session);

        return {
            lid,
            isAuthenticated: !!session,
            session,
        };
    })
}


