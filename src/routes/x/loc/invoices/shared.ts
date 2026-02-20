import { invoiceQueue } from "@/queues";
import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import { t } from "elysia";

export const PENDING_TRANSACTION_STATUS = "failed" as const;
export const PENDING_TRANSACTION_PAYMENT_TYPE = "cash" as const;

export function calcTotals(items: Array<{ quantity: number; price: number }>, tax = 0, discount = 0) {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = Math.max(0, subtotal + tax - discount);
    return { subtotal, total };
}

export function addInterval(date: Date, interval: string, threshold: number) {
    switch (interval) {
        case "day":
            return addDays(date, threshold);
        case "week":
            return addWeeks(date, threshold);
        case "year":
            return addYears(date, threshold);
        case "month":
        default:
            return addMonths(date, threshold);
    }
}

export async function scheduleInvoiceReminderAndOverdue(invoiceId: string, dueDate: Date, payload: Record<string, unknown>) {
    const reminderAt = addDays(dueDate, -2);
    const reminderDelay = Math.max(0, reminderAt.getTime() - Date.now());
    await invoiceQueue.add("reminder", {
        invoiceId,
        data: payload,
    }, {
        jobId: `invoice:reminder:${invoiceId}`,
        delay: reminderDelay,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
    });

    const overdueAt = addDays(dueDate, 1);
    const overdueDelay = Math.max(0, overdueAt.getTime() - Date.now());
    await invoiceQueue.add("overdue", {
        invoiceId,
        reminderCount: 0,
        data: {
            member: payload.member,
            location: payload.location,
        },
    }, {
        jobId: `overdue:${invoiceId}:reminder:0`,
        delay: overdueDelay,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
    });
}

export const invoiceItemBody = t.Object({
    id: t.Optional(t.String()),
    name: t.String(),
    description: t.Optional(t.String()),
    quantity: t.Number(),
    price: t.Number(),
});

export const createInvoiceBody = t.Object({
    memberId: t.String(),
    type: t.Union([
        t.Literal("one-off"),
        t.Literal("recurring"),
        t.Literal("from-subscription"),
    ]),
    collectionMethod: t.Optional(t.Union([t.Literal("send_invoice"), t.Literal("charge_automatically")])),
    paymentType: t.Union([t.Literal("cash"), t.Literal("card"), t.Literal("us_bank_account")]),
    subscriptionId: t.Optional(t.String()),
    selectedSubscriptionId: t.Optional(t.String()),
    items: t.Optional(t.Array(invoiceItemBody)),
    dueDate: t.Optional(t.String()),
    description: t.Optional(t.String()),
    tax: t.Optional(t.Number()),
    discount: t.Optional(t.Number()),
    notes: t.Optional(t.String()),
    isRecurring: t.Optional(t.Boolean()),
    recurringSettings: t.Optional(t.Any()),
});
