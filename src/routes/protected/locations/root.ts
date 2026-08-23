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
import { locationMercs } from "./mercs";
import { locationCourses } from "./courses";
import { locationEventRoutes } from "./events";
import { getLocationById } from "@/handlers/location";


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
                const location = await getLocationById(lid);
                if (!location) {
                    return status(404, { error: 'Location not found' });
                }

                const defaultTaxRate = location.taxRates.find((taxRate) => taxRate.isDefault) ?? location.taxRates[0];
                return status(200, {
                    ...location,
                    taxRate: defaultTaxRate,
                });
            } catch (error) {
                console.error(error);
                return status(500, { error: 'Internal server error' });
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
