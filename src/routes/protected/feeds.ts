import { db } from "@/db/db";
import { Elysia, type Context } from "elysia";
import { z } from "zod";
import type { UserFeed } from "@/types/feeds";

const UserFeedsProps = {
    params: z.object({
        type: z.enum(["moments", "posts", "group"]),
    }),
};

export function userFeedsRoutes(app: Elysia) {
    return app.group('/feeds/:type', (app) => {
        app.get("/", async ({ params, status, ...ctx }) => {
            const { type } = params;
            const { userId } = ctx as Context & { userId: string };
            if (!userId) {
                return status(401, { error: "Unauthorized" });
            }


            try {
                let feeds: UserFeed[] = [];
                if (type === "moments") {
                    feeds = await db.query.userFeeds.findMany({
                        where: (userFeeds, { eq, and, isNull, isNotNull }) => and(
                            eq(userFeeds.userId, userId),
                            isNull(userFeeds.viewedAt),
                            isNotNull(userFeeds.momentId),
                        ),
                        with: {
                            moment: {
                                with: {
                                    author: true,
                                },
                            },
                        },
                        orderBy: (userFeeds, { desc }) => desc(userFeeds.created),
                    });
                }
                if (type === "group") {
                    feeds = await db.query.userFeeds.findMany({
                        where: (userFeeds, { eq, and, isNull, isNotNull }) => and(
                            eq(userFeeds.userId, userId),
                            isNull(userFeeds.viewedAt),
                            isNotNull(userFeeds.postId),
                        ),
                        with: {
                            post: {
                                with: {
                                    group: true,
                                    author: true,
                                    medias: true,
                                },
                            },
                        },
                        orderBy: (userFeeds, { desc }) => desc(userFeeds.created),
                    });
                }

                return status(200, feeds);
            } catch (error) {
                console.error("Error fetching moments feed:", error);
                return status(500, { error: "Failed to fetch moments feed" });
            }
        }, UserFeedsProps);
        return app;
    })
}