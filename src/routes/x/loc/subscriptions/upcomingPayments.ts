import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type {
    CheckoutDiscount,
    MemberInvoice,
    SubscriptionBillingInput,
    UpcomingPayment,
    UpcomingPaymentsResponse,
} from "@/subtrees/types";
import type { Currency } from "@/subtrees/types/currency";
import { nextBillingBoundary } from "@/subtrees/utils/subscriptionBilling";

export type UpcomingSubscription = SubscriptionBillingInput & {
    memberId: string;
    member: { firstName: string; lastName: string | null } | null;
    status: string;
    paymentType: string;
    startDate: Date;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    trialEnd: Date | null;
    cancelAt: Date | null;
    cancelAtPeriodEnd: boolean;
    gatewayPaymentId: string | null;
};

export type UpcomingInvoice = Pick<
    MemberInvoice,
    | "id"
    | "memberPlanId"
    | "dueDate"
    | "forPeriodStart"
    | "forPeriodEnd"
    | "status"
    | "paid"
    | "total"
    | "currency"
    | "paymentType"
    | "metadata"
    | "renewalKey"
>;

export type UpcomingSchedule = {
    dueAt: Date;
    cycleCount: number;
    discount?: {
        duration: number;
        amount: number;
        type?: "fixed_amount" | "percentage";
        value?: number;
    };
    nextDueAt?: (after: Date) => Date | null;
    blocked?: boolean;
};

type UpcomingOptions = {
    collection?: "all" | "automatic" | "manual";
    manualPage?: number;
    automaticPage?: number;
    pageSize?: number;
};

export function remainingMonthWindow(
    now: Date,
    timezone: string,
): UpcomingPaymentsResponse["window"] {
    const today = formatInTimeZone(now, timezone, "yyyy-MM-dd");
    const [year, month, day] = today.split("-").map(Number) as [
        number,
        number,
        number,
    ];
    const nextMonth = new Date(Date.UTC(year, month, 1))
        .toISOString()
        .slice(0, 10);
    const tomorrow = new Date(Date.UTC(year, month - 1, day + 1))
        .toISOString()
        .slice(0, 10);
    return {
        from: fromZonedTime(`${today}T00:00:00`, timezone).toISOString(),
        untilExclusive: fromZonedTime(
            `${nextMonth}T00:00:00`,
            timezone,
        ).toISOString(),
        refreshAt: fromZonedTime(
            `${tomorrow}T00:00:00`,
            timezone,
        ).toISOString(),
        timezone,
    };
}

function billingState(
    invoice: UpcomingInvoice,
): Pick<UpcomingPayment, "state" | "reason"> {
    const attempt = invoice.metadata?.billingAttempt as
        | { status?: string }
        | undefined;
    if (
        ["in_flight", "processing", "unknown"].includes(attempt?.status ?? "")
    ) {
        return { state: "processing", reason: "Payment is processing" };
    }
    if (
        invoice.status === "uncollectible" ||
        (invoice.paymentType !== "cash" &&
            (invoice.status === "unpaid" ||
                ["failed", "requires_action"].includes(attempt?.status ?? "")))
    ) {
        return { state: "blocked", reason: "Payment needs attention" };
    }
    return { state: "scheduled", reason: null };
}

function matchesCycle(
    invoice: UpcomingInvoice,
    sid: string,
    start: Date,
    end: Date,
    due: Date,
) {
    if (invoice.memberPlanId !== sid) return false;
    if (invoice.renewalKey === `${sid}:${start.toISOString()}`) return true;
    if (invoice.forPeriodStart && invoice.forPeriodEnd) {
        return (
            invoice.forPeriodStart.getTime() === start.getTime() &&
            invoice.forPeriodEnd.getTime() === end.getTime()
        );
    }
    return invoice.dueDate.getTime() === due.getTime();
}

/** Projects billing cycles without creating invoices, jobs, or gateway requests. */
export function calculateUpcomingPayments({
    subscriptions,
    invoices,
    schedules,
    paidCounts,
    quote,
    currency,
    timezone,
    now = new Date(),
    canMarkPaid = false,
    options = {},
}: {
    subscriptions: UpcomingSubscription[];
    invoices: UpcomingInvoice[];
    schedules: Map<string, UpcomingSchedule>;
    paidCounts: Map<string, number>;
    quote: (
        sub: UpcomingSubscription,
        phase: "initial" | "renewal",
        discount?: CheckoutDiscount,
    ) => { total: number; currency: Currency };
    currency: Currency;
    timezone: string;
    now?: Date;
    canMarkPaid?: boolean;
    options?: UpcomingOptions;
}): UpcomingPaymentsResponse {
    const window = remainingMonthWindow(now, timezone);
    const from = new Date(window.from);
    const until = new Date(window.untilExclusive);
    const rows: UpcomingPayment[] = [];
    const roots = new Map(
        subscriptions
            .filter((sub) => sub.parentId === null)
            .map((sub) => [sub.id, sub]),
    );
    const invoicesBySubscription = new Map<string, UpcomingInvoice[]>();
    for (const invoice of invoices) {
        if (!invoice.memberPlanId) continue;
        const list = invoicesBySubscription.get(invoice.memberPlanId) ?? [];
        list.push(invoice);
        invoicesBySubscription.set(invoice.memberPlanId, list);
    }

    const identity = (sub: UpcomingSubscription) => ({
        subscriptionId: sub.id,
        member: {
            id: sub.memberId,
            name:
                [sub.member?.firstName, sub.member?.lastName]
                    .filter(Boolean)
                    .join(" ") || "Member",
        },
        membershipName: sub.pricing?.name ?? "Membership",
    });

    for (const invoice of invoices) {
        const sub = roots.get(invoice.memberPlanId ?? "");
        if (
            !sub ||
            invoice.paid ||
            ["paid", "void"].includes(invoice.status) ||
            invoice.dueDate < from ||
            invoice.dueDate >= until
        )
            continue;
        const state = billingState(invoice);
        rows.push({
            ...identity(sub),
            id: invoice.id,
            dueAt: invoice.dueDate.toISOString(),
            periodStart: invoice.forPeriodStart?.toISOString() ?? null,
            periodEnd: invoice.forPeriodEnd?.toISOString() ?? null,
            amountMinor: invoice.total,
            currency: (invoice.currency || currency) as Currency,
            collection: invoice.paymentType === "cash" ? "manual" : "automatic",
            source: "invoice",
            ...state,
            invoice: { id: invoice.id, status: invoice.status },
            canMarkPaid:
                canMarkPaid &&
                ["sent", "unpaid"].includes(invoice.status) &&
                invoice.paymentType === "cash" &&
                state.state === "scheduled",
        });
    }

    for (const sub of roots.values()) {
        if (
            !["active", "trialing", "incomplete"].includes(sub.status) ||
            sub.cancelAtPeriodEnd
        )
            continue;
        const schedule = schedules.get(sub.id);
        if (sub.status === "incomplete" && !schedule) continue;
        if (
            sub.paymentType !== "cash" &&
            sub.status === "trialing" &&
            !sub.gatewayPaymentId &&
            !schedule
        )
            continue;
        if (sub.startDate > now && !schedule && sub.paymentType !== "cash")
            continue;
        const cash = sub.paymentType === "cash";
        const firstDue =
            schedule?.dueAt ??
            (sub.status === "trialing" && sub.trialEnd
                ? sub.trialEnd
                : sub.currentPeriodEnd);
        if (!firstDue || firstDue < from || firstDue >= until) continue;
        let due: Date = firstDue;
        const storedAnchor =
            cash && typeof sub.metadata?.cashBillingAnchor === "string"
                ? new Date(sub.metadata.cashBillingAnchor)
                : due;
        const anchor = Number.isFinite(storedAnchor.getTime())
            ? storedAnchor
            : due;
        let previous = sub.currentPeriodStart ?? sub.startDate;
        const paidCount = paidCounts.get(sub.id) ?? 0;
        const promo = sub.metadata?.promo as
            | { discount?: UpcomingSchedule["discount"] }
            | undefined;
        const promotion = schedule?.discount ?? promo?.discount;
        const ownInvoices = invoicesBySubscription.get(sub.id) ?? [];

        // At most 31 daily charges can fall in the remaining month. The bound
        // also protects against malformed cadence or a non-advancing schedule.
        for (let index = 0; index < 32 && due < until; index++) {
            if (sub.cancelAt && due >= sub.cancelAt) break;
            let next: Date;
            try {
                if (!sub.pricing?.interval || !sub.pricing.intervalThreshold)
                    throw new Error(
                        "Membership billing cadence is unavailable",
                    );
                next =
                    schedule?.nextDueAt?.(due) ??
                    nextBillingBoundary(
                        anchor,
                        due,
                        sub.pricing.interval,
                        sub.pricing.intervalThreshold,
                    );
                if (next <= due)
                    throw new Error("Membership billing cadence is invalid");
            } catch {
                rows.push({
                    ...identity(sub),
                    id: `${sub.id}:${due.toISOString()}`,
                    dueAt: due.toISOString(),
                    periodStart: null,
                    periodEnd: null,
                    amountMinor: null,
                    currency,
                    collection: cash ? "manual" : "automatic",
                    source: "estimate",
                    state: "blocked",
                    reason: "Membership billing cadence is unavailable",
                    invoice: null,
                    canMarkPaid: false,
                });
                break;
            }
            const start = cash ? previous : due;
            const end = cash ? due : next;
            const existing = ownInvoices.find((invoice) =>
                matchesCycle(invoice, sub.id, start, end, due),
            );
            const cycleCount = cash
                ? paidCount + index + 1
                : (schedule?.cycleCount ?? paidCount + 1) + index;
            const discount =
                promotion && cycleCount <= promotion.duration
                    ? {
                          type: promotion.type ?? ("fixed_amount" as const),
                          value: promotion.value ?? promotion.amount,
                      }
                    : undefined;
            if (!existing) {
                let amount: number | null = null;
                let rowCurrency = currency;
                let reason: string | null =
                    !cash && (!schedule || schedule.blocked)
                        ? "Renewal is not scheduled"
                        : null;
                try {
                    const phase =
                        paidCount + index > 0 ||
                        sub.metadata?.additionalFeesStartAtRenewal === true
                            ? "renewal"
                            : "initial";
                    const result = quote(sub, phase, discount);
                    amount = result.total;
                    rowCurrency = result.currency;
                } catch {
                    reason = "Membership billing amount is unavailable";
                }
                rows.push({
                    ...identity(sub),
                    id: `${sub.id}:${start.toISOString()}`,
                    dueAt: due.toISOString(),
                    periodStart: start.toISOString(),
                    periodEnd: end.toISOString(),
                    amountMinor: amount,
                    currency: rowCurrency,
                    collection: cash ? "manual" : "automatic",
                    source: "estimate",
                    state: reason ? "blocked" : "scheduled",
                    reason,
                    invoice: null,
                    canMarkPaid: false,
                });
                if (reason) break;
            } else if (billingState(existing).state !== "scheduled") {
                break;
            }
            previous = due;
            due = next;
        }
    }

    const filtered = rows
        .filter(
            (row) =>
                !options.collection ||
                options.collection === "all" ||
                row.collection === options.collection,
        )
        .sort(
            (a, b) =>
                a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id),
        );
    const totals = new Map<Currency, number>();
    for (const row of filtered) {
        if (row.state !== "scheduled" || row.amountMinor === null) continue;
        totals.set(
            row.currency,
            (totals.get(row.currency) ?? 0) + row.amountMinor,
        );
    }
    if (!totals.size) totals.set(currency, 0);
    const paginate = (
        collection: UpcomingPayment["collection"],
        requestedPage = 1,
    ) => {
        const group = filtered.filter((row) => row.collection === collection);
        const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 5));
        const page = Math.min(
            Math.max(1, requestedPage),
            Math.max(1, Math.ceil(group.length / pageSize)),
        );
        return {
            rows: group.slice((page - 1) * pageSize, page * pageSize),
            page,
            pageSize,
            total: group.length,
        };
    };
    return {
        window,
        totals: [...totals].map(([currency, amountMinor]) => ({
            currency,
            amountMinor,
        })),
        preview: filtered.slice(0, 5),
        manual: paginate("manual", options.manualPage),
        automatic: paginate("automatic", options.automaticPage),
    };
}
