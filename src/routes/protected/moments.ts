import { db } from "@/db/db";
import { Elysia, type Context } from "elysia";
import { z } from "zod";

const MomentsFeedProps = {
    query: z.object({
        page: z.string().optional().default("1"),
        limit: z.string().optional().default("20"),
    }),
};

export function momentsRoutes(app: Elysia) {
    return app
        .get("/feed", async ({ query, status, ...ctx }) => {
            const { userId } = ctx as Context & { userId: string };
            if (!userId) {
                return status(401, { error: "Unauthorized" });
            }


            try {
                const feeds = await db.query.userFeeds.findMany({
                    where: (userFeeds, { eq }) => eq(userFeeds.userId, userId),
                    with: {
                        moment: true,
                        post: true,
                        author: true,
                        group: true,
                    },
                    limit: parseInt(query.limit || "20"),
                    offset: (parseInt(query.page || "1") - 1) * parseInt(query.limit || "20"),
                });

                return status(200, feeds);
            } catch (error) {
                console.error("Error fetching moments feed:", error);
                return status(500, { error: "Failed to fetch moments feed" });
            }
        }, MomentsFeedProps);
}