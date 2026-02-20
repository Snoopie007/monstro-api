import { Elysia } from "elysia"


const CURRENT_VERSION = `1.0.97`;
const PREVIOUS_VERSION = `1.0.96`;
const MINIMUM_VERSION = `1.0.97`;

export const appStatsRoutes = new Elysia({ prefix: '/app' })
    .get('/version', async ({ params, status }) => {

        return status(200, {
            previousVersion: PREVIOUS_VERSION,
            minimumVersion: MINIMUM_VERSION,
            latestVersion: CURRENT_VERSION,
            forceUpdateRequired: false,
        });
    });

