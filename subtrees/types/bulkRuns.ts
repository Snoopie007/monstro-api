import type { memberBulkRunItems, memberBulkRuns } from "../schemas/memberBulkRuns";

export type MemberBulkRun = typeof memberBulkRuns.$inferSelect;
export type MemberBulkRunItem = typeof memberBulkRunItems.$inferSelect;

export type BulkAction = MemberBulkRun["action"];
export type BulkRunStatus = MemberBulkRun["status"];
export type BulkItemStatus = MemberBulkRunItem["status"];

/**
 * What staff chose once for every member of a run, saved in `member_bulk_runs.input`.
 * The API checks it and saves it when the run starts, so the worker reads it as is.
 * A run only has the fields of its own action.
 */
export type BulkRunInput = {
    // register_event
    eventId: string;
    ticketId: string;
    // enroll_course
    courseId: string;
    // charge
    amount: number;
    item: string;
    description?: string;
    // Paid actions
    includeNonDefaultCards?: boolean;
    /** Ticket or course price in cents (0 when free) that staff approved. */
    unitPrice?: number;
};
