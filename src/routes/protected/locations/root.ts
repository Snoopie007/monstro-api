import { locationAchievements } from "./achievements";
import { locationCheckin } from "./checkin";
import { locationDocs } from "./docs";
import { locationNotifications } from "./notifications";
import { locationReservations } from "./reservations";
import { locationRewards } from "./rewards";
import { locationSessions } from "./sessions";
import { locationSupport } from "./support";
import { locationPurchaseRoutes } from "./purchase";
import { locationLeaderboard } from "./leaderboard";
import { locationPlans } from "./plans";
import { locationMigrateRoutes } from "./migrate";
import { Elysia } from "elysia";
import { locationEmail } from "./email";
import { db } from "@/db/db";
import { z } from "zod";

const LocationGetProps = {
    params: z.object({
        lid: z.string(),
    }),
};


export const locationsRoutes = new Elysia({ prefix: 'locations' })
    .use(locationEmail)
    .group('/:lid', (app) => {
        app.get('/', async ({ params, status }) => {
            const { lid } = params;
            try {
                const location = await db.query.locations.findFirst({
                    where: (l, { eq }) => eq(l.id, lid),
                    with: {
                        taxRates: true,
                        locationState: true,
                    },
                });

                if (!location) {
                    return status(404, { error: 'Location not found' });
                }


                let defaultTaxRate = location.taxRates.find((taxRate) => taxRate.isDefault);
                if (!defaultTaxRate) {
                    defaultTaxRate = location.taxRates[0] || undefined;
                }

                return status(200, {
                    ...location,
                    taxRate: defaultTaxRate,
                });
            } catch (error) {
                console.error(error);
                status(500, { error: 'Internal server error' });
                return { error: 'Internal server error' }
            }
        }, LocationGetProps);
        app.use(locationAchievements);
        app.use(locationCheckin);
        app.use(locationDocs);
        app.use(locationNotifications);
        app.use(locationReservations);
        app.use(locationRewards);
        app.use(locationSessions);
        app.use(locationSupport);
        app.use(locationLeaderboard);
        app.use(locationPlans);
        app.use(locationPurchaseRoutes);
        app.use(locationMigrateRoutes);
        return app;
    })