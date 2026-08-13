import { Elysia, t } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
import { db } from "@/db/db";
import { and, eq, sql } from "drizzle-orm";
import { users, websiteContents } from "@subtrees/schemas";

const DEFAULT_PAGE_SIZE = 10;

export async function getPublishedBlogPosts(
    locationId: string,
    requestedPage = 1,
    requestedLimit = DEFAULT_PAGE_SIZE,
) {
    const page = Math.max(1, Math.trunc(requestedPage));
    const limit = Math.min(100, Math.max(1, Math.trunc(requestedLimit)));
    const publishedPostsWhere = and(
        eq(websiteContents.locationId, locationId),
        eq(websiteContents.type, "post"),
        eq(websiteContents.status, "published"),
    );
    const [countRows, posts] = await Promise.all([
        db.select({ total: sql<number>`count(*)::int` })
            .from(websiteContents)
            .where(publishedPostsWhere),
        db.query.websiteContents.findMany({
            where: (content, { eq, and }) => and(
                eq(content.locationId, locationId),
                eq(content.type, "post"),
                eq(content.status, "published"),
            ),
            orderBy: (content, { desc }) => desc(content.publishedAt),
            limit,
            offset: (page - 1) * limit,
        }),
    ]);
    return { posts, total: countRows[0]?.total ?? 0 };
}

export async function getPublishedBlogPost(locationId: string, slug: string) {
    const [result] = await db
        .select({ post: websiteContents, authorName: users.name })
        .from(websiteContents)
        .leftJoin(users, eq(users.id, websiteContents.authorId))
        .where(and(
            eq(websiteContents.locationId, locationId),
            eq(websiteContents.slug, slug),
            eq(websiteContents.type, "post"),
            eq(websiteContents.status, "published"),
        ))
        .limit(1);
    return result ? { ...result.post, authorName: result.authorName } : undefined;
}

export const webContentRoutes = new Elysia({ prefix: "/content" })
    .use(WebAuthMiddleware)
    .group('/posts', (app) => {
        app.get('/', async ({ lid, status, query }) => {
            if (!lid) {
                return status(401, { message: "No Location ID provided" });
            }
            const { limit, page } = query;
            const pageSize = limit || DEFAULT_PAGE_SIZE;
            try {
                return status(200, await getPublishedBlogPosts(lid, page, pageSize));
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
                const post = await getPublishedBlogPost(lid, slug);
                if (!post) return status(404, { message: "Post not found" });
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

