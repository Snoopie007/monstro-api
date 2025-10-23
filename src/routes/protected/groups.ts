import { db } from "@/db/db";
import { sql } from "drizzle-orm";
import { Elysia } from "elysia";

type GetParams = {
    params: {
        gid: string
    }
    status: any
}

export function groupRoutes(app: Elysia) {
    return app.get('/', async ({ params, status }: GetParams) => {
        try {
            const group = await db.query.groups.findFirst({
                where: (groups, { eq }) => eq(groups.id, params.gid),
                orderBy: (groups, { desc }) => desc(groups.created),
                with: {
                    location: true,
                    posts: {
                        with: {
                            user: true,
                        },
                    },
                    groupMembers: {
                        with: {
                            user: true,
                        },
                    },
                },
            });




            return status(200, group);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch group" });
        }
    })
}