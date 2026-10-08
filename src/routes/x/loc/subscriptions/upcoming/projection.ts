import { getDeferredBilling, isDeferredFirstPeriod, nextDeferredBillingBoundary } from "@/subtrees/utils/deferredBilling";
import type {
    CheckoutDiscount,
    UpcomingPayment,
    UpcomingPaymentsResponse,
} from "@/subtrees/types";
import type { Currency } from "@/subtrees/types/currency";
import { nextBillingBoundary } from "@/subtrees/utils/subscriptionBilling";
import type {
    UpcomingSubscription,
    UpcomingInvoice,
    UpcomingSchedule,
} from "./payments";

type ProjectionInput = {
    subscription: UpcomingSubscription;
    invoices: UpcomingInvoice[];
    schedule?: UpcomingSchedule;
    paidCount: number;
    quote: (
        sub: UpcomingSubscription,
        phase: "initial" | "renewal",
        discount?: CheckoutDiscount,
        periodStart?: Date,
    ) => { total: number; currency: Currency };
    currency: Currency;
    now: Date;
    window: UpcomingPaymentsResponse["window"];
};
type BillingCycle = { due: Date; anchor: Date };
type BillingPeriod = { due: Date; start: Date; end: Date; index: number };

export function getInvoiceBillingState(
    invoice: UpcomingInvoice,
): Pick<UpcomingPayment, "state" | "reason"> {
    const attempt = invoice.metadata?.billingAttempt as
        { status?: string } | undefined;
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

export const getPaymentIdentity = (sub: UpcomingSubscription) => ({
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

export function calculateSubscriptionPayments(
    input: ProjectionInput,
): UpcomingPayment[] {
    const cycle = getFirstBillingCycle(input);
    if (!cycle) return [];
    const rows: UpcomingPayment[] = [];
    for (const period of getBillingPeriods(input, cycle)) {
        if ("unavailableAt" in period) {
            rows.push(
                getUnavailableCadencePayment(input, period.unavailableAt),
            );
            break;
        }
        const existing = input.invoices.find((invoice) =>
            matchesCycle(
                invoice,
                input.subscription.id,
                period.start,
                period.end,
                period.due,
            ),
        );
        if (existing) {
            if (getInvoiceBillingState(existing).state !== "scheduled") break;
            continue;
        }
        const row = calculateScheduledPayment(input, period);
        rows.push(row);
        if (row.state === "blocked") break;
    }
    return rows;
}

function getFirstBillingCycle(input: ProjectionInput): BillingCycle | null {
    const { subscription: sub, schedule, now, window } = input;
    const collectingStatuses = sub.paymentType === "cash"
        ? ["active", "trialing", "past_due", "unpaid"]
        : ["active", "trialing", "incomplete"];
    if (!collectingStatuses.includes(sub.status) || sub.cancelAtPeriodEnd)
        return null;
    if (sub.status === "incomplete" && !schedule) return null;
    if (sub.paymentType !== "cash" && !schedule) {
        if (sub.status === "trialing" && !sub.gatewayPaymentId) return null;
        if (sub.startDate > now) return null;
    }
    const due =
        schedule?.dueAt ??
        (sub.status === "trialing" && sub.trialEnd
            ? sub.trialEnd
            : sub.currentPeriodEnd);
    if (
        !due ||
        due < new Date(window.from) ||
        due >= new Date(window.untilExclusive)
    )
        return null;
    return {
        due,
        anchor: getBillingAnchor(sub, due),
    };
}

function getBillingAnchor(sub: UpcomingSubscription, due: Date) {
    const stored =
        sub.paymentType === "cash" &&
        typeof sub.metadata?.cashBillingAnchor === "string"
            ? new Date(sub.metadata.cashBillingAnchor)
            : due;
    return Number.isFinite(stored.getTime()) ? stored : due;
}

function* getBillingPeriods(
    input: ProjectionInput,
    cycle: BillingCycle,
): Generator<BillingPeriod | { unavailableAt: Date }> {
    const { subscription: sub, schedule, window } = input;
    const until = new Date(window.untilExclusive);
    const { anchor } = cycle;
    let { due } = cycle;
    // A month contains at most 31 daily charges. Also bound malformed schedules.
    for (let index = 0; index < 32 && due < until; index++) {
        if (sub.cancelAt && due >= sub.cancelAt) return;
        let next: Date;
        try {
            if (!sub.pricing?.interval || !sub.pricing.intervalThreshold)
                throw new Error("Missing billing cadence");
            const deferred = getDeferredBilling(sub.metadata);
            next = deferred ? nextDeferredBillingBoundary(deferred, due, sub.pricing.interval, sub.pricing.intervalThreshold, window.timezone) :
                schedule?.nextDueAt?.(due) ??
                nextBillingBoundary(
                    anchor,
                    due,
                    sub.pricing.interval,
                    sub.pricing.intervalThreshold,
                );
            if (next <= due) throw new Error("Invalid billing cadence");
        } catch {
            yield { unavailableAt: due };
            return;
        }
        yield {
            due,
            start: due,
            end: next,
            index,
        };
        due = next;
    }
}

function getCycleDiscount(
    input: ProjectionInput,
    index: number,
): CheckoutDiscount | undefined {
    const { subscription: sub, schedule, paidCount } = input;
    const cash = sub.paymentType === "cash";
    const promo = sub.metadata?.promo as
        { discount?: UpcomingSchedule["discount"] } | undefined;
    const promotion = cash ? promo?.discount : schedule?.discount;
    const cycleCount = cash
        ? paidCount + index + 1
        : (schedule?.cycleCount ?? paidCount + 1) + index;
    if (!promotion || !(cycleCount <= promotion.duration)) return undefined;
    return {
        type: promotion.type ?? "fixed_amount",
        value: promotion.value ?? promotion.amount,
    };
}

function calculateScheduledPayment(
    input: ProjectionInput,
    period: BillingPeriod,
): UpcomingPayment {
    const { subscription: sub, schedule, paidCount, quote, currency } = input;
    const cash = sub.paymentType === "cash";
    let amount: number | null = null;
    let rowCurrency = currency;
    let reason: string | null =
        !cash && (!schedule || schedule.blocked)
            ? "Renewal is not scheduled"
            : null;
    try {
        const phase =
            (cash && sub.status !== "trialing" && !isDeferredFirstPeriod(getDeferredBilling(sub.metadata), period.start)) ||
            paidCount + period.index > 0 ||
            sub.metadata?.additionalFeesStartAtRenewal === true
                ? "renewal"
                : "initial";
        const result = quote(sub, phase, getCycleDiscount(input, period.index), period.start);
        amount = result.total;
        rowCurrency = result.currency;
    } catch {
        reason = "Membership billing amount is unavailable";
    }
    return {
        ...getPaymentIdentity(sub),
        id: `${sub.id}:${period.start.toISOString()}`,
        dueAt: period.due.toISOString(),
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
        amountMinor: amount,
        currency: rowCurrency,
        collection: cash ? "manual" : "automatic",
        source: "estimate",
        state: reason ? "blocked" : "scheduled",
        reason,
        invoice: null,
        canMarkPaid: false,
    };
}

function getUnavailableCadencePayment(
    input: ProjectionInput,
    due: Date,
): UpcomingPayment {
    const { subscription: sub, currency } = input;
    return {
        ...getPaymentIdentity(sub),
        id: `${sub.id}:${due.toISOString()}`,
        dueAt: due.toISOString(),
        periodStart: null,
        periodEnd: null,
        amountMinor: null,
        currency,
        collection: sub.paymentType === "cash" ? "manual" : "automatic",
        source: "estimate",
        state: "blocked",
        reason: "Membership billing cadence is unavailable",
        invoice: null,
        canMarkPaid: false,
    };
}
