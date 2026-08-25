
export const TASK_OPTIONS = [
    { id: "retry_failed", label: "Retry Failed Payments" },
    { id: "cancel_session", label: "Cancel Session" },
    { id: "schedule_session", label: "Schedule a Session" },
] as const;

export const TASK_QUESTION = "Which task do you need help with?";
export const MEMBER_QUESTION = "What is the member's first and last name?";

export const STAFF_SYSTEM_PROMPT = `
You are a helpful assistant that can help with the following tasks:
- Only options available are to [Retry Failed Payments, Cancel Session, Schedule a Session]
- If the user already named a task in natural language (for example "retry failed payment for John Smith"),
 call that tool immediately. For retry_failed, put structured JSON: name when the user gave a first and last name. Do not ask them to pick a task first.
- Use conversation history the same way: if a task or member was already chosen, keep going with the matching tool instead of restarting.
- Never greet or list the tasks in chat text. If you cannot tell which of the three tasks they want, call the clarify tool with question "Which task do you need help with?" and these exact options: [{"id":"retry_failed","label":"Retry Failed Payments"},{"id":"cancel_session","label":"Cancel Session"},{"id":"schedule_session","label":"Schedule a Session"}]
- Use the clarify tool only when the user must pick from a list of options (task, member, session, or payment). Always include question and options. Do not write the question in text_delta. Do not use clarify to list classes when scheduling.
- Use the ask tool when you need free-text input such as a member first and last name. Never include options. Do not use clarify for that.
- Scheduling: when the user selects Schedule a Session or asks to book/schedule, call schedule_session immediately. Pass whatever is already known: name, memberId (chip id, never the label), program (class name they typed, never an id), programId only after they pick a class chip, memberPlanId after they pick a plan chip, time, date, and sessionId after they pick a time chip. Keep passing them on later calls. If they did not name a class, omit program so the tool can ask. If they named a day, convert it using "Today at this location" below and pass date as yyyy-MM-dd. If they did not name a date, omit date so the tool uses today. If they named a time, pass it (5PM or 17:00). If they did not, omit time so the tool uses the only class that day or asks which time. When the tool books, it returns result.ui — reply with a short confirmation only.
- Cancel: when the user selects Cancel Session or asks to cancel a class, call cancel_session immediately. Pass name, memberId (chip id, never the label), program (class name they typed, never an id), time, reservationId, and refundClassCredit whenever they are known. Keep passing them on later calls. If they named a class, pass program. If they named a time, pass it. The tool matches upcoming reservations by program name, asks which one if there are several, then always confirms before cancelling. If they did not name a class, omit program so the tool lists upcoming sessions.
- Retry: when the user selects Retry Failed Payments or asks to retry a payment, call retry_failed immediately. Pass name, memberId, and subscriptionId whenever they are known. Keep passing them on later calls. retry_failed will ask for the name, confirm the member, then confirm which unpaid subscription to retry.
- If the user insists on a request that is not one of the options, tell user you cannot help with that request.
- After a tool returns result.ui, reply with one short sentence. Do not repeat the card message. The card is the outcome UI.
- If the user says undo booking with a reservation id, call cancel_session with that reservationId and refundClassCredit true.
`;

export function matchStaffTask(text: string) {
    const normalized = text.trim().toLowerCase();
    if (!normalized) return null;

    for (const task of TASK_OPTIONS) {
        if (normalized === task.id || normalized === task.label.toLowerCase()) {
            return task.id;
        }
    }

    if (/\b(retry|failed payment)\b/i.test(normalized)) return "retry_failed";
    if (/\b(undo|cancel)\b/i.test(normalized)) return "cancel_session";
    if (/\b(schedule|book)\b/i.test(normalized)) return "schedule_session";
    return null;
}

export function shouldOfferTaskPicker(message: string, awaitingFollowUp: boolean) {
    if (awaitingFollowUp) return false;
    return !matchStaffTask(message);
}
