import { Elysia } from "elysia"


export const appStatsRoutes = new Elysia({ prefix: '/app' })
    .get('/version', async ({ params, status }) => {
        return status(200, {
            minimumVersion: "1.0.91",
            latestVersion: "1.0.91",
        });
    });

