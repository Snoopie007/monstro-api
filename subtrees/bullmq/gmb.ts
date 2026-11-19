import { z } from "zod";

/**
 * GMB auto-posting. The API queues `draft` when auto-post is turned on; workers run all three jobs.
 * draft: writes the next post and queues its publish. publish: posts it, then queues the next draft.
 * sweep: every few hours, re-queues profiles whose chain stopped.
 */
export const GMB_POST_QUEUE = "gmb-posts";
export const GMB_DRAFT_JOB = "draft";
export const GMB_PUBLISH_JOB = "publish";
export const GMB_SWEEP_JOB = "sweep";

export const GMBDraftJobSchema = z.object({
    gmbId: z.string().trim().min(1),
    /** `<photo_source>:<photo_ref>` to try last, e.g. the photo of a post the owner replaced. */
    avoidPhotoKey: z.string().trim().min(1).optional(),
}).strict();

export const GMBPublishJobSchema = z.object({
    postId: z.string().trim().min(1),
}).strict();

export type GMBDraftJobData = z.infer<typeof GMBDraftJobSchema>;
export type GMBPublishJobData = z.infer<typeof GMBPublishJobSchema>;

/** One draft job per profile per UTC day, so a repeat toggle or a sweep can't queue a second one. */
export function gmbDraftJobId(gmbId: string, at = new Date()) {
    return `gmb-draft-${gmbId}-${at.toISOString().slice(0, 10)}`;
}

export function gmbPublishJobId(postId: string) {
    return `gmb-publish-${postId}`;
}

/** One key per photo across uploads and review photos, from gmb_posts.photo_source + photo_ref. */
export function gmbPhotoKey(source: string, ref: string) {
    return `${source}:${ref}`;
}
