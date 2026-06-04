
import { Elysia } from 'elysia';
import { auth } from '@/libs/BetterAuth/config';




const WEB_AUTH_SCOPES = [
    'user.readonly',
    'enroll.create',
    'enroll.readonly',
]



export async function WebAuthMiddleware(app: Elysia) {
    return app.resolve(async ({ headers, status }) => {

        // Get token from Authorization header
        const lid = headers['locationid'];
        if (!lid) {
            console.log('AuthMiddleware: No Location ID header');
            return status(401, {
                message: "No Location ID provided",
                code: "UNAUTHORIZED"
            });
        }


        const session = await auth.api.getSession({
            headers
        });


        return {
            lid,
            isAuthenticated: !!session,
            session,
        };
    })
}


