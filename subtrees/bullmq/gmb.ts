import { z } from "zod";

/**
 * GMB automation jobs, all on one queue; workers run them.
 * Posts: the API queues `post:draft` when auto-post is turned on. A draft writes the next post and queues
 * its `post:publish`; publish posts it, then queues the next draft; `post:sweep` (daily) restarts profiles
 * whose chain stopped.
 * Review replies: `reply:day` (daily) queues one `reply:next` per auto-reply profile at a random time that day.
 */
export const GMB_QUEUE = "gmb";
export const GMB_DRAFT_JOB = "post:draft";
export const GMB_PUBLISH_JOB = "post:publish";
export const GMB_SWEEP_JOB = "post:sweep";
export const GMB_REPLY_DAY_JOB = "reply:day";
export const GMB_REPLY_JOB = "reply:next";

/** Default options of the gmb queue, in the API and the workers alike: 3 tries, a failed job kept a week. */
export const GMB_JOB_OPTIONS = {
    attempts: 3,
    backoff: { type: "exponential", delay: 60 * 1000 },
    removeOnComplete: true,
    removeOnFail: { age: 60 * 60 * 24 * 7 },
};

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

/**
 * A draft still waiting isn't queued twice in a day (UTC). The date is there because a failed draft
 * is kept a week: without it, that failure would block every later draft for the profile.
 */
export function gmbDraftJobId(gmbId: string, at = new Date()) {
    return `gmb-draft-${gmbId}-${at.toISOString().slice(0, 10)}`;
}

/** Every draft is queued with this, from the API and the workers alike. */
export function buildGMBDraftJob(gmbId: string, avoidPhotoKey?: string) {
    return {
        name: GMB_DRAFT_JOB,
        data: { gmbId, avoidPhotoKey } satisfies GMBDraftJobData,
        opts: { jobId: gmbDraftJobId(gmbId) },
    };
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
