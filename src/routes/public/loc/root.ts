import { Elysia, t } from "elysia";
import { publicDocsRoutes } from "./docs";
import { publicLocationPromos } from "./promo";
import { publicLocationPaymentGateway } from "./PaymentGateway";
import { publicLocationPlans } from "./plans";
import { db } from "@/db/db";
import { publicLocationSchedulesRoutes } from "./schedules";

export const publicLocationRoutes = new Elysia({ prefix: "/loc" })
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
                console.error("Failed to get location", error);
                return status(500, { error: "Failed to get location" });
            }
        }, {
            params: t.Object({
                lid: t.String(),
            }),
        });
        app.use(publicDocsRoutes)
        app.use(publicLocationPromos)
        app.use(publicLocationPaymentGateway)
        app.use(publicLocationPlans)
        app.use(publicLocationSchedulesRoutes)
        return app;
    })
