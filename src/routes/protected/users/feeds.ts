import { db } from "@/db/db";
import { and, isNull, eq, inArray } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { userFeeds } from "@subtrees/schemas";
const UserFeedsProps = {

    params: t.Object({
        uid: t.String(),
    }),
    query: t.Object({
        lastFeedDate: t.Optional(t.String()),
    }),
};

export function userFeedsRoutes(app: Elysia) {
    return app.group('/feeds', (app) => {
        app.get("/", async ({ params, query, status }) => {
            const { uid } = params;
            const { lastFeedDate } = query;
            const startDate = lastFeedDate ? new Date(lastFeedDate) : new Date();

            try {

                const feeds = await db.query.userFeeds.findMany({
                    where: (userFeeds, { eq, and, gte }) => and(
                        eq(userFeeds.userId, uid),
                        gte(userFeeds.created, startDate),
                    ),
                    with: {
                        author: {
                            columns: {
                                id: true,
                                name: true,
                                image: true,
                            },
                        },
                        group: true,
                        post: {
                            with: {
                                medias: true,
                            }
                        },
                        moment: {
                            with: {
                                medias: true,
                            },
                        },

                    },
                    orderBy: (userFeeds, { desc }) => desc(userFeeds.created),
                });




                return status(200, feeds);
            } catch (error) {
                console.error("Error fetching moments feed:", error);
                return status(500, { error: "Failed to fetch moments feed" });
            }
        }, UserFeedsProps);
        app.post("/viewed", async ({ params, body, status }) => {
            const { uid } = params;
            const { feedIds, viewedAt } = body;

            try {
                await db.update(userFeeds).set({
                    viewedAt: new Date(viewedAt),
                }).where(and(
                    eq(userFeeds.userId, uid), isNull(userFeeds.viewedAt),
                    inArray(userFeeds.id, feedIds),
                ));
                return status(201, { success: true });
            } catch (error) {
                console.error("Error creating feed:", error);
                return status(500, { error: "Failed to create feed" });
            }
        }, {
            params: t.Object({
                uid: t.String(),
            }),
            body: t.Object({
                feedIds: t.Array(t.String()),
                viewedAt: t.String(),
            }),
        });
        return app;
    })
}