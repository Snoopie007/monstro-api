import { Elysia } from "elysia";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { groups } from "@/db/schemas";

type Props = {
    params: {
        lid: string;
    };
    set: {
        status: number;
    };
};

export const xGroups = new Elysia({ prefix: "/groups" })
    .get("/", async ({ params, set }: Props) => {
        const { lid } = params;

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

