import { db } from "@/db/db";
import { groups } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";

type Props = {
    params: {
        lid: string;
    };
    set: {
        status: number;
    };
};

export const xGroups = new Elysia({ prefix: "/groups" })
    .get("/", async (ctx) => {
        const { params, set } = ctx;
        const { lid } = params as { lid: string };

        try {
            const locationGroups = await db.query.groups.findMany({
                where: eq(groups.locationId, lid),
                columns: {
                    id: true,
                    name: true,
                    description: true,
                    type: true,
                    handle: true,
                    coverImage: true,
                },
            });

            return locationGroups;
        } catch (error) {
            console.error("Error fetching groups:", error);
            set.status = 500;
            return {
                success: false,
                error: `Failed to fetch groups: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
    });

