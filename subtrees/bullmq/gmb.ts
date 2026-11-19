import { z } from "zod";

/**
 * GMB automation jobs, all on one queue; workers run them.
 * Posts: the API queues `draft` when auto-post is turned on. draft writes the next post and queues its
 * publish; publish posts it, then queues the next draft; sweep (daily) restarts profiles whose chain stopped.
 * Review replies: `reply-day` (daily) queues one `reply` per auto-reply profile at a random time that day.
 */
export const GMB_POST_QUEUE = "gmb-posts";
export const GMB_DRAFT_JOB = "draft";
export const GMB_PUBLISH_JOB = "publish";
export const GMB_SWEEP_JOB = "sweep";
export const GMB_REPLY_DAY_JOB = "reply-day";
export const GMB_REPLY_JOB = "reply";

export const GMBDraftJobSchema = z.object({
    gmbId: z.string().trim().min(1),
    /** `<photo_source>:<photo_ref>` to try last, e.g. the photo of a post the owner replaced. */
    avoidPhotoKey: z.string().trim().min(1).optional(),
}).strict();

export const GMBPublishJobSchema = z.object({
    postId: z.string().trim().min(1),
}).strict();

export const GMBReplyJobSchema = z.object({
    gmbId: z.string().trim().min(1),
}).strict();

export type GMBDraftJobData = z.infer<typeof GMBDraftJobSchema>;
export type GMBPublishJobData = z.infer<typeof GMBPublishJobSchema>;
export type GMBReplyJobData = z.infer<typeof GMBReplyJobSchema>;

/** Same id all day (UTC), so a draft that is still waiting isn't queued twice. */
export function gmbDraftJobId(gmbId: string, at = new Date()) {
    return `gmb-draft-${gmbId}-${at.toISOString().slice(0, 10)}`;
}

export function gmbPublishJobId(postId: string) {
    return `gmb-publish-${postId}`;
}

/** One reply job per profile per local date (`yyyy-MM-dd`): at most one review reply a day. */
export function gmbReplyJobId(gmbId: string, localDate: string) {
    return `gmb-reply-${gmbId}-${localDate}`;
}

/** One key per photo across uploads and review photos, from gmb_posts.photo_source + photo_ref. */
export function gmbPhotoKey(source: string, ref: string) {
    return `${source}:${ref}`;
}
