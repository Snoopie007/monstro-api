import { Elysia } from "elysia";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/db";
import { gmbQueue } from "@/queues";
import { buildGMBDraftJob, gmbPhotoKey } from "@/subtrees/bullmq";
import { gmb, gmbPostPhotos, gmbPosts, integrations } from "@/subtrees/schemas";
import { AddonStatus, type GMBPost } from "@/subtrees/types";
import { loadPostContext, writeGMBPost } from "@/subtrees/utils/server/gmbPostWriter";
import S3Bucket from "@/libs/s3";

const s3 = new S3Bucket();
const MAX_PHOTOS = 50;
const ToggleSchema = z.object({ enabled: z.boolean() }).strict();
const PhotoSaveSchema = z.object({ url: z.string().url().max(2048) }).strict();

/** Google takes JPG or PNG post photos up to 5 MB. */
const PhotoUploadSchema = z.object({
    file: z.object({
        name: z.string().trim().min(1).max(200),
        type: z.enum(["image/jpeg", "image/png"]),
        size: z.number().int().positive().max(5 * 1024 * 1024),
    }),
}).strict();

/** Google caps a post's text at 1,500 characters. `photoId` swaps in a library photo. */
const PostEditSchema = z.object({
    summary: z.string().trim().min(1).max(1500),
    photoId: z.string().trim().min(1).optional(),
}).strict();

/** `photoId`: write for this library photo instead of the post's own. */
const PostRewriteSchema = z.object({ photoId: z.string().trim().min(1).optional() }).strict();

const NOT_SCHEDULED = { error: "This post is no longer scheduled", code: "POST_NOT_SCHEDULED" };
const PHOTO_NOT_FOUND = { error: "Photo not found" };

/**
 * Why a Pro automation can't be turned on, or null when it can.
 * Workers repeat this check on every run (`loadGMBAutomation` in mworkers src/jobs/gmb/automation.ts).
 */
async function automationBlocker(gmbRow: { locationId: string; locationAddon: { status: AddonStatus } | null }) {
    if (gmbRow.locationAddon?.status !== AddonStatus.ACTIVE) {
        return { status: 403, body: { error: "This is part of GMB Pro", code: "PRO_REQUIRED" } } as const;
    }

    const integration = await db.query.integrations.findFirst({
        where: and(eq(integrations.locationId, gmbRow.locationId), eq(integrations.service, "gmb")),
        columns: { id: true },
    });
    if (!integration) {
        return { status: 400, body: { error: "Reconnect Google Business Profile first", code: "GMB_NOT_CONNECTED" } } as const;
    }

    return null;
}

/** A library photo in gmb_posts' column shape, so a post can take it as is. */
async function libraryPhoto(gmbId: string, photoId: string): Promise<Pick<GMBPost, "photoUrl" | "photoSource" | "photoRef"> | undefined> {
    const photo = await db.query.gmbPostPhotos.findFirst({
        where: and(eq(gmbPostPhotos.id, photoId), eq(gmbPostPhotos.gmbId, gmbId)),
        columns: { id: true, url: true },
    });

    return photo && { photoUrl: photo.url, photoSource: "upload", photoRef: photo.id };
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
 * GMB automations for the vendor portal (Pro). Workers (src/jobs/gmb) do the work:
 * one AI post a day, and one AI reply a day to a 3–5 star review.
 */
export const xGmb = new Elysia({ prefix: "/gmb" })
    .resolve(async ({ params, status }) => {
        // SAFETY: x/root.ts mounts this under /loc/:lid.
        const { lid } = params as { lid: string };
        const gmbRow = await db.query.gmb.findFirst({
            where: eq(gmb.locationId, lid),
            columns: { id: true, locationId: true, profile: true },
            with: { locationAddon: { columns: { status: true } } },
        });
        if (!gmbRow) return status(404, { error: "Connect a Google Business Profile first", code: "GMB_NOT_FOUND" });

        return { lid, gmbRow };
    })

    // ---- Automation switches ----

    // On: queues the first draft. Off: cancels the scheduled post.
    .put("/auto-post", async ({ body, gmbRow, status }) => {
        const parsed = ToggleSchema.safeParse(body);
        if (!parsed.success) return status(400, { error: "Invalid request" });

        const now = new Date();
        if (!parsed.data.enabled) {
            await db.transaction(async (tx) => {
                await tx.update(gmb).set({ autoPost: false, updated: now }).where(eq(gmb.id, gmbRow.id));
                // The publish job re-reads the row, so a canceled post is never sent.
                await tx.update(gmbPosts)
                    .set({ status: "canceled", error: "Auto-post was turned off", updated: now })
                    .where(and(eq(gmbPosts.gmbId, gmbRow.id), eq(gmbPosts.status, "scheduled")));
            });

            return { autoPost: false };
        }

        const blocked = await automationBlocker(gmbRow);
        if (blocked) return status(blocked.status, blocked.body);

        await db.update(gmb).set({ autoPost: true, updated: now }).where(eq(gmb.id, gmbRow.id));
        const job = buildGMBDraftJob(gmbRow.id);
        await gmbQueue.add(job.name, job.data, job.opts);

        return { autoPost: true };
    })
    // The workers' daily run (06:00 UTC) picks the profile up, so the first reply goes out the next day.
    .put("/auto-reply", async ({ body, gmbRow, status }) => {
        const parsed = ToggleSchema.safeParse(body);
        if (!parsed.success) return status(400, { error: "Invalid request" });

        if (parsed.data.enabled) {
            const blocked = await automationBlocker(gmbRow);
            if (blocked) return status(blocked.status, blocked.body);
        }

        await db.update(gmb).set({ autoReply: parsed.data.enabled, updated: new Date() }).where(eq(gmb.id, gmbRow.id));

        return { autoReply: parsed.data.enabled };
    })

    // ---- Scheduled post ----

    // The owner edits a scheduled post: its text, and optionally a library photo in place of its own.
    // The publish job reads the row when it runs.
    .patch("/posts/:postId", async ({ body, params, gmbRow, status }) => {
        const parsed = PostEditSchema.safeParse(body);
        if (!parsed.success) return status(400, { error: "Post text must be 1 to 1,500 characters" });

        const { summary, photoId } = parsed.data;
        const photo = photoId ? await libraryPhoto(gmbRow.id, photoId) : undefined;
        if (photoId && !photo) return status(404, PHOTO_NOT_FOUND);

        const [post] = await db.update(gmbPosts)
            .set({ summary, ...photo, updated: new Date() })
            .where(and(eq(gmbPosts.id, params.postId), eq(gmbPosts.gmbId, gmbRow.id), eq(gmbPosts.status, "scheduled")))
            .returning();
        if (!post) return status(409, NOT_SCHEDULED);

        return { post };
    })
    // "Rewrite with AI": new text for the post's photo, or for the library photo the owner picked.
    // Nothing is saved: the dialog shows the text and the owner saves it with PATCH.
    .post("/posts/:postId/rewrite", async ({ body, params, gmbRow, status, server, request }) => {
        // The AI call takes 10–30s; Bun closes a quiet request after 10s by default.
        server?.timeout(request, 90);
        const parsed = PostRewriteSchema.safeParse(body ?? {});
        if (!parsed.success) return status(400, { error: "Invalid request" });

        const post = await db.query.gmbPosts.findFirst({
            where: and(eq(gmbPosts.id, params.postId), eq(gmbPosts.gmbId, gmbRow.id), eq(gmbPosts.status, "scheduled")),
            columns: { summary: true, photoUrl: true, photoSource: true },
        });
        if (!post) return status(409, NOT_SCHEDULED);

        const photo = parsed.data.photoId ? await libraryPhoto(gmbRow.id, parsed.data.photoId) : post;
        if (!photo) return status(404, PHOTO_NOT_FOUND);

        const context = await loadPostContext(db, gmbRow);
        // The current text goes first, so the new version opens differently.
        context.recentSummaries.unshift(post.summary);
        try {
            // The API has no Google client, so a review photo is written without its review's text.
            const summary = await writeGMBPost(context, { url: photo.photoUrl, source: photo.photoSource, reviewComment: null });
            if (!summary) return status(422, { error: "Couldn't load this photo. Pick another one.", code: "PHOTO_UNAVAILABLE" });

            return { summary };
        } catch (error) {
            console.error("[GMB Posts] Rewrite failed", error);
            return status(502, { error: "Couldn't rewrite the post. Try again.", code: "REWRITE_FAILED" });
        }
    })
    // "Replace post": drop this one; the worker writes a new one with a different photo for the
    // location's next day. The old photo is tried last.
    .post("/posts/:postId/replace", async ({ params, gmbRow, status }) => {
        const [post] = await db.update(gmbPosts)
            .set({ status: "canceled", error: "Replaced by the owner.", updated: new Date() })
            .where(and(eq(gmbPosts.id, params.postId), eq(gmbPosts.gmbId, gmbRow.id), eq(gmbPosts.status, "scheduled")))
            .returning({ photoSource: gmbPosts.photoSource, photoRef: gmbPosts.photoRef });
        if (!post) return status(409, NOT_SCHEDULED);

        const job = buildGMBDraftJob(gmbRow.id, gmbPhotoKey(post.photoSource, post.photoRef));
        await gmbQueue.add(job.name, job.data, job.opts);

        return { replaced: true };
    })

    // ---- Photo library ----

    // Uploaded like product images: presign, the browser sends the file straight to S3, then save its URL.
    .post("/photos/presigned", async ({ body, lid, gmbRow, status }) => {
        const parsed = PhotoUploadSchema.safeParse(body);
        if (!parsed.success) return status(400, { error: "Use a JPG or PNG photo up to 5 MB" });

        const { name, type } = parsed.data.file;
        const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");

        return s3.getPresignedUploadUrl(photoFolder(lid, gmbRow.id), `${crypto.randomUUID()}-${safeName}`, type);
    })
    .post("/photos", async ({ body, lid, gmbRow, status }) => {
        const parsed = PhotoSaveSchema.safeParse(body);
        if (!parsed.success) return status(400, { error: "Invalid request" });
        if (!isOurUpload(parsed.data.url, lid, gmbRow.id)) return status(400, { error: "Upload the photo first" });

        const total = await db.$count(gmbPostPhotos, eq(gmbPostPhotos.gmbId, gmbRow.id));
        if (total >= MAX_PHOTOS) return status(400, { error: `You can keep up to ${MAX_PHOTOS} photos`, code: "PHOTO_LIMIT" });

        const [photo] = await db.insert(gmbPostPhotos).values({ gmbId: gmbRow.id, url: parsed.data.url }).returning();

        return status(201, { photo });
    })
    // The S3 file stays: past posts still show it.
    .delete("/photos/:photoId", async ({ params, gmbRow, status }) => {
        const [deleted] = await db.delete(gmbPostPhotos)
            .where(and(eq(gmbPostPhotos.id, params.photoId), eq(gmbPostPhotos.gmbId, gmbRow.id)))
            .returning({ id: gmbPostPhotos.id });
        if (!deleted) return status(404, PHOTO_NOT_FOUND);

        // A post still waiting to go out with this photo is dropped and redrafted with another one.
        const canceled = await db.update(gmbPosts)
            .set({ status: "canceled", error: "The photo was removed from the library.", updated: new Date() })
            .where(and(
                eq(gmbPosts.gmbId, gmbRow.id),
                eq(gmbPosts.status, "scheduled"),
                eq(gmbPosts.photoSource, "upload"),
                eq(gmbPosts.photoRef, params.photoId),
            ))
            .returning({ id: gmbPosts.id });
        if (canceled.length) {
            const job = buildGMBDraftJob(gmbRow.id);
            await gmbQueue.add(job.name, job.data, job.opts);
        }

        return { id: deleted.id };
    });
