import { db } from "@/db/db";
import type { Elysia } from "elysia";
import { z } from "zod";
import type { UserFeed } from "@subtrees/types";

const UserFeedsProps = {

    params: z.object({
        uid: z.string(),
        type: z.enum(["moments", "posts", "group"]),
    }),
};

export function userFeedsRoutes(app: Elysia) {
    return app.group('/feeds/:type', (app) => {
        app.get("/", async ({ params, status, ...ctx }) => {
            const { type, uid } = params;
            try {
                let feeds: UserFeed[] = [];
                if (type === "moments") {
                    feeds = await db.query.userFeeds.findMany({
                        where: (userFeeds, { eq, and, isNull, isNotNull }) => and(
                            eq(userFeeds.userId, uid),
                            isNull(userFeeds.viewedAt),
                            isNotNull(userFeeds.momentId),
                        ),
                        with: {
                            author: true,
                            moment: {
                                with: {
                                    medias: true,
                                },
                            },

                        },
                        orderBy: (userFeeds, { desc }) => desc(userFeeds.created),
                    });
                }
                if (type === "group") {
                    feeds = await db.query.userFeeds.findMany({
                        where: (userFeeds, { eq, and, isNull, isNotNull }) => and(
                            eq(userFeeds.userId, uid),
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