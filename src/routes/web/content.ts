import { Elysia, t } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
import { db } from "@/db/db";
import { and, eq, sql } from "drizzle-orm";
import { websiteContents } from "@subtrees/schemas";


export const webContentRoutes = new Elysia({ prefix: "/content" })
    .use(WebAuthMiddleware)
    .group('/posts', (app) => {
        app.get('/', async ({ lid, status, query }) => {
            if (!lid) {
                return status(401, { message: "No Location ID provided" });
            }
            const { limit, page } = query;
            const pageSize = limit || 100;
            const pageNumber = page ?? 1;
            try {
                const publishedPostsWhere = and(
                    eq(websiteContents.locationId, lid),
                    eq(websiteContents.type, "post"),
                    eq(websiteContents.status, "published"),
                );

                const [countRows, posts] = await Promise.all([
                    db.select({ total: sql<number>`count(*)::int` })
                        .from(websiteContents)
                        .where(publishedPostsWhere),
                    db.query.websiteContents.findMany({
                        where: (content, { eq, and }) => and(
                            eq(content.locationId, lid),
                            eq(content.type, "post"),
                            eq(content.status, "published"),
                        ),
                        orderBy: (content, { desc }) => desc(content.created),
                        limit: pageSize,
                        offset: (pageNumber - 1) * pageSize,
                    }),
                ]);

                const total = countRows[0]?.total ?? 0;

                return status(200, {
                    total,
                    posts,
                });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to fetch posts" });
            }


        }, {
            query: t.Object({
                limit: t.Optional(t.Number()),
                page: t.Optional(t.Number()),
            }),
        })
        app.get('/:slug', async ({ lid, status, params }) => {
            try {
                const { slug } = params;
                if (!lid) {
                    return status(401, { message: "No Location ID provided" });
                }
                const post = await db.query.websiteContents.findFirst({
                    where: (content, { eq }) => eq(content.slug, slug),
                });
                return status(200, post);
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to fetch post" });
            }
        }, {
            params: t.Object({
                slug: t.String(),
            }),
        })
        return app;
    });

