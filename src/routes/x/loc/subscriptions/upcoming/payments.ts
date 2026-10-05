import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type {
    CheckoutDiscount,
    MemberInvoice,
    SubscriptionBillingInput,
    UpcomingPayment,
    UpcomingPaymentsResponse,
} from "@/subtrees/types";
import type { Currency } from "@/subtrees/types/currency";
import {
    calculateSubscriptionPayments,
    getInvoiceBillingState,
    getPaymentIdentity,
} from "./projection";

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
        periodStart?: Date,
    ) => { total: number; currency: Currency };
    currency: Currency;
    timezone: string;
    now?: Date;
    canMarkPaid?: boolean;
    options?: UpcomingOptions;
}): UpcomingPaymentsResponse {
    const window = remainingMonthWindow(now, timezone);
    const roots = subscriptions.filter((sub) => sub.parentId === null);
    const invoicesBySubscription = groupInvoicesBySubscription(invoices);
    const invoiceRows = getInvoicePayments(
        invoices,
        roots,
        window,
        currency,
        canMarkPaid,
    );
    const projectedRows = roots.flatMap((subscription) =>
        calculateSubscriptionPayments({
            subscription,
            invoices: invoicesBySubscription.get(subscription.id) ?? [],
            schedule: schedules.get(subscription.id),
            paidCount: paidCounts.get(subscription.id) ?? 0,
            quote,
            currency,
            now,
            window,
        }),
    );
    return formatUpcomingPayments(
        [...invoiceRows, ...projectedRows],
        window,
        currency,
        options,
    );
}

function groupInvoicesBySubscription(invoices: UpcomingInvoice[]) {
    const grouped = new Map<string, UpcomingInvoice[]>();
    for (const invoice of invoices) {
        if (!invoice.memberPlanId) continue;
        const list = grouped.get(invoice.memberPlanId) ?? [];
        list.push(invoice);
        grouped.set(invoice.memberPlanId, list);
    }
    return grouped;
}

function getInvoicePayments(
    invoices: UpcomingInvoice[],
    subscriptions: UpcomingSubscription[],
    window: UpcomingPaymentsResponse["window"],
    currency: Currency,
    canMarkPaid: boolean,
): UpcomingPayment[] {
    const roots = new Map(subscriptions.map((sub) => [sub.id, sub]));
    const from = new Date(window.from);
    const until = new Date(window.untilExclusive);
    const rows: UpcomingPayment[] = [];
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
        const state = getInvoiceBillingState(invoice);
        rows.push({
            ...getPaymentIdentity(sub),
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

    return rows;
}

function formatUpcomingPayments(
    rows: UpcomingPayment[],
    window: UpcomingPaymentsResponse["window"],
    currency: Currency,
    options: UpcomingOptions,
): UpcomingPaymentsResponse {
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
