import { Elysia } from "elysia"


const CURRENT_VERSION = `1.1.03`;
const PREVIOUS_VERSION = `1.1.03`;
const MINIMUM_VERSION = `1.1.03`;

export const appStatsRoutes = new Elysia({ prefix: '/app' })
    .get('/version', async ({ params, status }) => {

        return status(200, {
            previousVersion: PREVIOUS_VERSION,
            minimumVersion: MINIMUM_VERSION,
            latestVersion: CURRENT_VERSION,
            forceUpdateRequired: false,
        });
    });

