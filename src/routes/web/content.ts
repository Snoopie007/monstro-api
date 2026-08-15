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

const SUMMARY_WORD_LIMIT = 30;

/** Strip MDX/markdown noise to plain text for list excerpts. */
function mdxToPlainText(mdx: string): string {
    return mdx
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`[^`]*`/g, " ")
        .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
        .replace(/\[[^\]]*]\([^)]*\)/g, " ")
        .replace(/<\/?[^>]+>/g, " ")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/[*_~>#-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/** First sentence if present; otherwise first 30 words. */
function createPostSummary(mdx: string): string {
    const text = mdxToPlainText(mdx);
    if (!text) return "";

    const sentenceMatch = text.match(/^(.+?[.!?])(?:\s|$)/);
    if (sentenceMatch?.[1]) {
        const sentence = sentenceMatch[1].trim();
        const words = sentence.split(/\s+/);
        if (words.length <= SUMMARY_WORD_LIMIT) return sentence;
        return `${words.slice(0, SUMMARY_WORD_LIMIT).join(" ")}…`;
    }

    const words = text.split(/\s+/);
    if (words.length <= SUMMARY_WORD_LIMIT) return text;
    return `${words.slice(0, SUMMARY_WORD_LIMIT).join(" ")}…`;
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
                const { posts, total } = await getPublishedBlogPosts(lid, page, pageSize);
                return status(200, {
                    total,
                    posts: posts.map((post) => {
                        const { mdx, ...rest } = post;
                        return { ...rest, summary: createPostSummary(mdx) };
                    }),
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

