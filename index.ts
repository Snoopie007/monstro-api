import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import "./src/libs/worker"; // Import worker to start processing
import { serverConfig } from "./src/config";
import { RateLimitMiddleware } from "./src/middlewares";
import { AuthRoutes, ProtectedRoutes } from "./src/routes";

const CORS_CONFIG = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key']
}


const app = new Elysia()

app.use(cors(CORS_CONFIG))
    .use(RateLimitMiddleware())

    .onRequest(({ request }) => {
        console.log(`🔍 ${request.method} ${request.url}`);
    })
    .group('/api', (app) =>
        app.use(AuthRoutes).use(ProtectedRoutes)
    )
    .onError(({ code, error, set }) => {
        console.error(`❌ Error ${code}:`, error);

        if (code === 'VALIDATION') {
            set.status = 400;
            return { error: 'Validation failed', details: error.message };
        }

        if (code === 'NOT_FOUND') {
            set.status = 404;
            return { error: 'Route not found' };
        }

        set.status = 500;
        return { error: 'Internal server error' };
    })
    .listen(serverConfig.port);

console.log(`🚀 Bun server running on http://localhost:${serverConfig.port}`);