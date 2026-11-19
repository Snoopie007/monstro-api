import { Elysia } from "elysia";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/db";
import { gmbPostQueue } from "@/queues";
import { GMB_DRAFT_JOB, gmbDraftJobId, gmbPhotoKey } from "@/subtrees/bullmq";
import { gmb, gmbKeywords, gmbPostPhotos, gmbPosts, integrations } from "@/subtrees/schemas";
import { downloadPostPhoto, writeGMBPost } from "@/subtrees/utils/server/gmbPostWriter";
import S3Bucket from "@/libs/s3";

const s3 = new S3Bucket();
const MAX_PHOTOS = 50;
/** Published posts the AI sees, so a rewrite doesn't repeat them. */
const RECENT_SUMMARIES = 10;
const ToggleSchema = z.object({ enabled: z.boolean() }).strict();
const PhotoSaveSchema = z.object({ url: z.string().url().max(2048) }).strict();
/** Google caps a post's text at 1,500 characters. `photoId` swaps in a library photo. */
const PostEditSchema = z.object({
    summary: z.string().trim().min(1).max(1500),
    photoId: z.string().trim().min(1).optional(),
}).strict();
/** `photoId`: write for this library photo instead of the post's own. */
const PostRewriteSchema = z.object({ photoId: z.string().trim().min(1).optional() }).strict();
const NOT_SCHEDULED = { error: "This post is no longer scheduled", code: "POST_NOT_SCHEDULED" };

function findLibraryPhoto(gmbId: string, photoId: string) {
    return db.query.gmbPostPhotos.findFirst({
        where: and(eq(gmbPostPhotos.id, photoId), eq(gmbPostPhotos.gmbId, gmbId)),
        columns: { id: true, url: true },
    });
}
/** Google takes JPG or PNG post photos up to 5 MB. */
const PhotoUploadSchema = z.object({
    file: z.object({
        name: z.string().trim().min(1).max(200),
        type: z.enum(["image/jpeg", "image/png"]),
        size: z.number().int().positive().max(5 * 1024 * 1024),
    }),
}).strict();

/** Why a Pro automation can't be turned on, or null when it can. */
async function automationBlocker(lid: string, addonStatus: string | undefined) {
    if (addonStatus !== "active") {
        return { status: 403, body: { error: "This is part of GMB Pro", code: "PRO_REQUIRED" } } as const;
    }
    const integration = await db.query.integrations.findFirst({
        where: and(eq(integrations.locationId, lid), eq(integrations.service, "gmb")),
        columns: { id: true },
    });
    if (!integration) {
        return { status: 400, body: { error: "Reconnect Google Business Profile first", code: "GMB_NOT_CONNECTED" } } as const;
    }
    return null;
}

function findAutomationProfile(lid: string) {
    return db.query.gmb.findFirst({
        where: eq(gmb.locationId, lid),
        columns: { id: true },
        with: { locationAddon: { columns: { status: true } } },
    });
}

/**
 * GMB automations for the vendor portal (Pro). Workers (src/jobs/gmbPosts, gmbReplies) do the work:
 * one AI post a day, and one AI reply a day to a 3–5 star review.
 */
export const xGmb = new Elysia({ prefix: "/gmb" })
    // On: queues the first draft. Off: cancels the scheduled post.
    .put("/auto-post", async (ctx) => {
        const { lid } = ctx.params as { lid: string };
        const parsed = ToggleSchema.safeParse(ctx.body);
        if (!parsed.success) return ctx.status(400, { error: "Invalid request" });

        const row = await findAutomationProfile(lid);
        if (!row) return ctx.status(404, { error: "Connect a Google Business Profile first", code: "GMB_NOT_FOUND" });

        const now = new Date();
        if (!parsed.data.enabled) {
            await db.transaction(async (tx) => {
                await tx.update(gmb).set({ autoPost: false, updated: now }).where(eq(gmb.id, row.id));
                // The publish job re-reads the row, so a canceled post is never sent.
                await tx.update(gmbPosts)
                    .set({ status: "canceled", error: "Auto-post was turned off", updated: now })
                    .where(and(eq(gmbPosts.gmbId, row.id), eq(gmbPosts.status, "scheduled")));
            });
            return { autoPost: false };
        }

        const blocked = await automationBlocker(lid, row.locationAddon?.status);
        if (blocked) return ctx.status(blocked.status, blocked.body);

        await db.update(gmb).set({ autoPost: true, updated: now }).where(eq(gmb.id, row.id));
        // Same id all day: a draft still waiting in the queue isn't added twice.
        await gmbPostQueue.add(GMB_DRAFT_JOB, { gmbId: row.id }, { jobId: gmbDraftJobId(row.id, now) });
        return { autoPost: true };
    })
    // The workers' daily run (06:00 UTC) picks the profile up, so the first reply goes out the next day.
    .put("/auto-reply", async (ctx) => {
        const { lid } = ctx.params as { lid: string };
        const parsed = ToggleSchema.safeParse(ctx.body);
        if (!parsed.success) return ctx.status(400, { error: "Invalid request" });

        const row = await findAutomationProfile(lid);
        if (!row) return ctx.status(404, { error: "Connect a Google Business Profile first", code: "GMB_NOT_FOUND" });
        if (parsed.data.enabled) {
            const blocked = await automationBlocker(lid, row.locationAddon?.status);
            if (blocked) return ctx.status(blocked.status, blocked.body);
        }

        await db.update(gmb).set({ autoReply: parsed.data.enabled, updated: new Date() }).where(eq(gmb.id, row.id));
        return { autoReply: parsed.data.enabled };
    })
    // The owner edits a scheduled post: its text, and optionally a library photo in place of its own.
    // The publish job reads the row when it runs.
    .patch("/posts/:postId", async (ctx) => {
        const { lid, postId } = ctx.params as { lid: string; postId: string };
        const parsed = PostEditSchema.safeParse(ctx.body);
        if (!parsed.success) return ctx.status(400, { error: "Post text must be 1 to 1,500 characters" });

        const row = await findProfile(lid);
        if (!row) return ctx.status(404, { error: "Connect a Google Business Profile first", code: "GMB_NOT_FOUND" });

        let photo = {};
        if (parsed.data.photoId) {
            const chosen = await findLibraryPhoto(row.id, parsed.data.photoId);
            if (!chosen) return ctx.status(404, { error: "Photo not found" });
            photo = { photoUrl: chosen.url, photoSource: "upload" as const, photoRef: chosen.id };
        }

        const [post] = await db.update(gmbPosts)
            .set({ summary: parsed.data.summary, ...photo, updated: new Date() })
            .where(and(eq(gmbPosts.id, postId), eq(gmbPosts.gmbId, row.id), eq(gmbPosts.status, "scheduled")))
            .returning();
        if (!post) return ctx.status(409, NOT_SCHEDULED);
        return { post };
    })
    // "Rewrite with AI": new text for the post's photo, or for the library photo the owner picked.
    // Nothing is saved: the dialog shows the text and the owner saves it with PATCH.
    .post("/posts/:postId/rewrite", async (ctx) => {
        // The AI call takes 10–30s; Bun closes a quiet request after 10s by default.
        ctx.server?.timeout(ctx.request, 90);
        const { lid, postId } = ctx.params as { lid: string; postId: string };
        const parsed = PostRewriteSchema.safeParse(ctx.body ?? {});
        if (!parsed.success) return ctx.status(400, { error: "Invalid request" });

        const row = await db.query.gmb.findFirst({ where: eq(gmb.locationId, lid), columns: { id: true, profile: true } });
        if (!row) return ctx.status(404, { error: "Connect a Google Business Profile first", code: "GMB_NOT_FOUND" });
        const post = await db.query.gmbPosts.findFirst({
            where: and(eq(gmbPosts.id, postId), eq(gmbPosts.gmbId, row.id), eq(gmbPosts.status, "scheduled")),
            columns: { summary: true, photoUrl: true, photoSource: true, photoRef: true },
        });
        if (!post) return ctx.status(409, NOT_SCHEDULED);

        let photo = { url: post.photoUrl, source: post.photoSource, ref: post.photoRef };
        if (parsed.data.photoId) {
            const chosen = await findLibraryPhoto(row.id, parsed.data.photoId);
            if (!chosen) return ctx.status(404, { error: "Photo not found" });
            photo = { url: chosen.url, source: "upload", ref: chosen.id };
        }
        const downloaded = await downloadPostPhoto(photo.url);
        if (!downloaded) return ctx.status(422, { error: "Couldn't load this photo. Pick another one.", code: "PHOTO_UNAVAILABLE" });

        const [keywords, recent] = await Promise.all([
            db.select({ keyword: gmbKeywords.keyword }).from(gmbKeywords).where(eq(gmbKeywords.gmbId, row.id)),
            db.select({ summary: gmbPosts.summary })
                .from(gmbPosts)
                .where(and(eq(gmbPosts.gmbId, row.id), eq(gmbPosts.status, "published")))
                .orderBy(desc(gmbPosts.publishedAt))
                .limit(RECENT_SUMMARIES),
        ]);
        try {
            const written = await writeGMBPost({
                profile: row.profile,
                keywords: keywords.map((item) => item.keyword),
                // The current text goes first, so the new version opens differently.
                recentSummaries: [post.summary, ...recent.map((item) => item.summary)],
                photo: { ...downloaded, source: photo.source, reviewComment: null },
                // The photo already passed the worker's check, or the owner picked it.
                checkFit: false,
            });
            if (!written.photoFits) throw new Error("The writer turned down a chosen photo");
            return { summary: written.summary, photo };
        } catch (error) {
            console.error("[GMB Posts] Rewrite failed", error);
            return ctx.status(502, { error: "Couldn't rewrite the post. Try again.", code: "REWRITE_FAILED" });
        }
    })
    // "Replace post": drop this one; the worker writes a new one with a different photo for the
    // location's next day. The old photo is tried last.
    .post("/posts/:postId/replace", async (ctx) => {
        const { lid, postId } = ctx.params as { lid: string; postId: string };
        const row = await findProfile(lid);
        if (!row) return ctx.status(404, { error: "Connect a Google Business Profile first", code: "GMB_NOT_FOUND" });

        const now = new Date();
        const [post] = await db.update(gmbPosts)
            .set({ status: "canceled", error: "Replaced by the owner.", updated: now })
            .where(and(eq(gmbPosts.id, postId), eq(gmbPosts.gmbId, row.id), eq(gmbPosts.status, "scheduled")))
            .returning({ photoSource: gmbPosts.photoSource, photoRef: gmbPosts.photoRef });
        if (!post) return ctx.status(409, NOT_SCHEDULED);

        if (row.autoPost) {
            const avoidPhotoKey = post.photoRef ? gmbPhotoKey(post.photoSource, post.photoRef) : undefined;
            await gmbPostQueue.add(GMB_DRAFT_JOB, { gmbId: row.id, avoidPhotoKey }, { jobId: gmbDraftJobId(row.id, now) });
        }
        return { replaced: true };
    });

function findProfile(lid: string) {
    return db.query.gmb.findFirst({ where: eq(gmb.locationId, lid), columns: { id: true, autoPost: true } });
}

/** Uploads for a profile go to `locs/<lid>/gmb/<gmbId>/`. */
function photoFolder(lid: string, gmbId: string) {
    return `locs/${lid}/gmb/${gmbId}`;
}

/** True when the URL is a file the presign route handed out for this profile. */
function isOurUpload(value: string, lid: string, gmbId: string) {
    const url = new URL(value);
    return !url.search && !url.hash && url.href.startsWith(s3.getPublicUrl(`${photoFolder(lid, gmbId)}/`));
}

/**
 * Auto-post photo library, uploaded like product images:
 * presign, the browser sends the file straight to S3, then save its URL.
 */
export const xGmbPhotos = new Elysia({ prefix: "/gmb" })
    .post("/photos/presigned", async (ctx) => {
        const { lid } = ctx.params as { lid: string };
        const parsed = PhotoUploadSchema.safeParse(ctx.body);
        if (!parsed.success) return ctx.status(400, { error: "Use a JPG or PNG photo up to 5 MB" });

        const row = await findProfile(lid);
        if (!row) return ctx.status(404, { error: "Connect a Google Business Profile first", code: "GMB_NOT_FOUND" });

        const { name, type } = parsed.data.file;
        const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
        return s3.getPresignedUploadUrl(photoFolder(lid, row.id), `${crypto.randomUUID()}-${safeName}`, type);
    })
    .post("/photos", async (ctx) => {
        const { lid } = ctx.params as { lid: string };
        const parsed = PhotoSaveSchema.safeParse(ctx.body);
        if (!parsed.success) return ctx.status(400, { error: "Invalid request" });

        const row = await findProfile(lid);
        if (!row) return ctx.status(404, { error: "Connect a Google Business Profile first", code: "GMB_NOT_FOUND" });
        if (!isOurUpload(parsed.data.url, lid, row.id)) return ctx.status(400, { error: "Upload the photo first" });
        const [{ total }] = await db.select({ total: count() }).from(gmbPostPhotos).where(eq(gmbPostPhotos.gmbId, row.id));
        if (total >= MAX_PHOTOS) return ctx.status(400, { error: `You can keep up to ${MAX_PHOTOS} photos`, code: "PHOTO_LIMIT" });

        const [photo] = await db.insert(gmbPostPhotos).values({ gmbId: row.id, url: parsed.data.url }).returning();
        return ctx.status(201, { photo });
    })
    // The S3 file stays: past posts still show it.
    .delete("/photos/:photoId", async (ctx) => {
        const { lid, photoId } = ctx.params as { lid: string; photoId: string };
        const row = await findProfile(lid);
        if (!row) return ctx.status(404, { error: "Connect a Google Business Profile first", code: "GMB_NOT_FOUND" });

        const [deleted] = await db.delete(gmbPostPhotos)
            .where(and(eq(gmbPostPhotos.id, photoId), eq(gmbPostPhotos.gmbId, row.id)))
            .returning({ id: gmbPostPhotos.id });
        if (!deleted) return ctx.status(404, { error: "Photo not found" });

        // A post still waiting to go out with this photo is dropped and redrafted with another one.
        const now = new Date();
        const canceled = await db.update(gmbPosts)
            .set({ status: "canceled", error: "The photo was removed from the library.", updated: now })
            .where(and(
                eq(gmbPosts.gmbId, row.id),
                eq(gmbPosts.status, "scheduled"),
                eq(gmbPosts.photoSource, "upload"),
                eq(gmbPosts.photoRef, photoId),
            ))
            .returning({ id: gmbPosts.id });
        if (canceled.length && row.autoPost) {
            await gmbPostQueue.add(GMB_DRAFT_JOB, { gmbId: row.id }, { jobId: gmbDraftJobId(row.id, now) });
        }
        return { id: deleted.id, postReplaced: canceled.length > 0 };
    });
