import { Elysia } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
import { db } from "@/db/db";


export const webLocationStateRoutes = new Elysia({ prefix: "/state" })
    .use(WebAuthMiddleware)
    .get('/', async ({ status, lid }) => {

        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }

        try {

            const locationState = await db.query.locationState.findFirst({
                where: (l, { eq }) => eq(l.locationId, lid),
            });

            if (!locationState) {
                return status(404, { error: 'Location state not found' });
            }

            const taxRates = await db.query.taxRates.findMany({
                where: (t, { eq }) => eq(t.locationId, lid),
            });

            let defaultTaxRate = taxRates.find((taxRate) => taxRate.isDefault);
            if (!defaultTaxRate) {
                defaultTaxRate = taxRates[0] || undefined;
            }

            return status(200, {
                ...locationState,
                taxRate: defaultTaxRate,
            });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch products" });
        }
    });