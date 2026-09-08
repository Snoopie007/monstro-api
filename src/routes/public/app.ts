import { Elysia } from "elysia"


const CURRENT_VERSION = `1.1.13`;
const PREVIOUS_VERSION = `1.1.13`;
const MINIMUM_VERSION = `1.1.13`;

const STAFF_CURRENT_VERSION = `0.0.1`;
const STAFF_PREVIOUS_VERSION = `0.0.1`;
const STAFF_MINIMUM_VERSION = `0.0.1`;

export const appStatsRoutes = new Elysia({ prefix: '/app' })
    .get('/version', async ({ params, status }) => {

        return status(200, {
            previousVersion: PREVIOUS_VERSION,
            minimumVersion: MINIMUM_VERSION,
            latestVersion: CURRENT_VERSION,
            forceUpdateRequired: false,
        });
    })
    .get('/version/staff', async ({ params, status }) => {
        return status(200, {
            previousVersion: STAFF_PREVIOUS_VERSION,
            minimumVersion: STAFF_MINIMUM_VERSION,
            latestVersion: STAFF_CURRENT_VERSION,
            forceUpdateRequired: false,
        });
    });

