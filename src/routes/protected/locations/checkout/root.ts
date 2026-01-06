import { db } from "@/db/db"
import { Elysia } from "elysia"
import { z } from "zod";



const LocationCheckoutProps = {
    params: z.object({
        lid: z.string(),
    }),
};

export function locationCheckoutRoutes(app: Elysia) {
    app.get('/checkout', async ({ params, status }) => {
        const { lid } = params;
        try {

            return status(200, { message: "Checkout" });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to checkout" });
        }
    }, LocationCheckoutProps)
    return app;
}

