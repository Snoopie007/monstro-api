import { db } from "@/db/db";
import type { Elysia } from "elysia";
import { z } from "zod";

const LocationMercsProps = {
    params: z.object({
        lid: z.string(),
    }),
};

export async function locationMercs(app: Elysia) {
    return app.get('/mercs', async ({ params, status }) => {
        const { lid } = params;

        try {
            const products = await db.query.products.findMany({
                where: (p, { eq }) => eq(p.locationId, lid),
                with: {
                    variants: true,
                    images: true,
                },
            });

            return status(200, products);
        } catch (error) {
            console.error(error);
            return status(500, "Failed to fetch achievements");
        }
    }, LocationMercsProps)
}
