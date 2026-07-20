import { locationAchievements } from "./achievements";
import { locationCheckin } from "./checkin";
import { locationDocs } from "./docs";
import { locationNotifications } from "./notifications";
import { locationReservations } from "./reservations";
import { locationRewards } from "./rewards";
import { locationSessions } from "./sessions";
import { locationSupport } from "./support";
import { locationEnrollRoutes } from "./enroll";
import { locationLeaderboard } from "./leaderboard";
import { onboardingRoutes } from "./onboarding";
import { locationPromos } from "./promos";
import { locationMigrateRoutes } from "./migrate";
import { locationPass } from "./pass";
import { locationPlans } from "./plans";
import { Elysia, t } from "elysia";
import { locationEmail } from "./email";
import { db } from "@/db/db";
import { locationMercs } from "./mercs";
import { locationCourses } from "./courses";
import { locationEventRoutes } from "./events";


const LocationGetProps = {
    params: t.Object({
        lid: t.String(),
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
        app.use(locationPass);
        app.use(locationPromos);
        app.use(locationSupport);
        app.use(locationMercs);
        app.use(locationLeaderboard);
        app.use(locationPlans);
        app.use(locationEnrollRoutes);
        app.use(locationMigrateRoutes);
        app.use(locationCourses);
        app.use(onboardingRoutes);
        app.use(locationEventRoutes);
        return app;
    })
