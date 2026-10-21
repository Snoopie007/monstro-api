import { Elysia } from 'elysia';
import { AuthXMiddleware } from '@/middlewares';
import { hasLocationPermissions } from '@/utils/locationAccess';
import { xInvoices } from './loc/invoices/root';
import { xClass } from './loc/class/root';
import { xEmail } from './loc/email/root';
import { xChat } from './loc/chats/root';
import { xBots } from './loc/bots/root';
import { xGroups } from './loc/groups/root';
import { locMembers } from './loc/locMembers';
import { xSubscriptions } from './loc/subscriptions/root';
import { xPromos } from './loc/promos/root';
import { xTransactions } from './loc/transactions/root';
import { xMigrations } from './loc/migrate/root';
import { xMerchandise } from './loc/merchandise/root';
import { xPrograms } from './loc/programs/root';
import { xEvents } from './loc/events/root';
import { xCourses } from './loc/courses/root';
import { locationEnrollRoutes } from "../protected/locations/enroll";
import { xAdditionalFees } from "./loc/additionalFees";
import { xGoogleAds } from "./loc/ads/google/root";

export const XRoutes = new Elysia()
    .use(AuthXMiddleware)
    .use(xEmail)
    .group('/loc/:lid', (app) => {
        app.use(xInvoices);
        app.use(xClass);
        app.use(xChat);
        app.use(xBots);
        app.use(xGroups);
        app.use(xSubscriptions);
        app.use(xPromos);
        app.use(xTransactions);
        app.use(xMerchandise);
        app.use(xMigrations);
        app.use(xPrograms);
        app.use(xEvents);
        app.use(xCourses);
        // The member app shares these enroll handlers, so the staff check lives on this mount.
        app.guard({
            async beforeHandle(ctx) {
                const { lid } = ctx.params as { lid: string };
                if (!await hasLocationPermissions(lid, ctx, ["view plans", "manage billing"])) {
                    return ctx.status(403, { error: "Forbidden", code: "FORBIDDEN" });
                }
            },
        }, (app) => app.use(locationEnrollRoutes));
        app.use(xAdditionalFees);
        app.use(xGoogleAds);
        app.group('/members', (app) => app.use(locMembers));
        return app;
    })
