// Same fixed sender used by Monstro's existing API and worker EmailSender.
export const DEFAULT_WORKFLOW_SENDER = 'no-reply@mymonstro.com';
export const MAX_NOTIFICATION_RECIPIENTS = 100;
export class WorkflowRecipientError extends Error {}

export function validWorkflowEmail(value: string) {
    return /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value.trim());
}

export type WorkflowTeamRecipient = { userId: string; name: string; email: string; role: 'vendor' | 'staff' };
export type WorkflowRecipient = { email: string; userIds: string[] };

/** Fail the whole selection before sending. Never silently drop removed staff. */
export function selectedWorkflowRecipients(ids: unknown, choices: WorkflowTeamRecipient[]): WorkflowRecipient[] {
    if (!Array.isArray(ids) || !ids.length || ids.length > MAX_NOTIFICATION_RECIPIENTS || ids.some(id => typeof id !== 'string' || !id.trim())) {
        throw new WorkflowRecipientError(`Select 1–${MAX_NOTIFICATION_RECIPIENTS} team recipients`);
    }
    const recipients = new Map<string, WorkflowRecipient>();
    for (const id of new Set<string>(ids)) {
        const account = choices.find(choice => choice.userId === id);
        if (!account) throw new WorkflowRecipientError(`Selected recipient is no longer available in this location: ${id}`);
        const email = account.email.trim().toLowerCase();
        if (!validWorkflowEmail(email)) throw new WorkflowRecipientError(`Selected recipient has no valid email: ${account.name}`);
        const recipient = recipients.get(email) ?? { email, userIds: [] };
        recipient.userIds.push(id);
        recipients.set(email, recipient);
    }
    return [...recipients.values()];
}
