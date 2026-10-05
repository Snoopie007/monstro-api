import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { Interval } from "../types/DatabaseEnums";
import { nextBillingBoundary } from "./subscriptionBilling";

export type DeferredBilling = {
  version: 1;
  firstPaymentAt: string;
  prorate: boolean;
  prorationAmount: number;
  pausedAt?: string | null;
  pausedDays?: number;
  originalProrationAmount?: number;
};

/** Return null for ordinary billing. Reject invalid billing settings so we do not charge the wrong amount. */
export function getDeferredBilling(metadata: Record<string, unknown> | null | undefined): DeferredBilling | null {
  const { deferredBilling: raw } = metadata ?? {};
  if (raw === undefined) return null;
  if (!raw || typeof raw !== "object") throw new Error("Invalid deferred billing schedule");

  const {
    version, firstPaymentAt, prorate, prorationAmount,
  } = raw as Record<string, unknown>;

  // Check stored field types before using the billing dates or amounts.
  if (version !== 1 || typeof firstPaymentAt !== "string"
    || typeof prorate !== "boolean" || typeof prorationAmount !== "number") {
    throw new Error("Invalid deferred billing schedule");
  }
  if (!Number.isFinite(new Date(firstPaymentAt).getTime())) {
    throw new Error("Invalid deferred billing schedule");
  }

  // Amounts must be whole cents. When proration is off, the extra charge must be zero.
  if (!Number.isSafeInteger(prorationAmount) || prorationAmount < 0 || (!prorate && prorationAmount !== 0)) {
    throw new Error("Invalid deferred billing schedule");
  }

  const pauseFields = getPauseFields(raw as Record<string, unknown>);

  return {
    version, firstPaymentAt, prorate, prorationAmount,
    ...pauseFields,
  };
}

/** Validate the saved pause dates, paused days, and original prorated amount. */
function getPauseFields({ pausedAt, pausedDays, originalProrationAmount }: Record<string, unknown>) {
  // These fields are added after the first pause. A null pausedAt means the subscription is not paused.
  if (pausedAt != null) {
    if (typeof pausedAt !== "string" || !Number.isFinite(new Date(pausedAt).getTime())) {
      throw new Error("Invalid deferred billing schedule");
    }
  }
  if (pausedDays !== undefined) {
    if (typeof pausedDays !== "number" || !Number.isSafeInteger(pausedDays) || pausedDays < 0) {
      throw new Error("Invalid deferred billing schedule");
    }
  }
  if (originalProrationAmount !== undefined) {
    if (typeof originalProrationAmount !== "number" || !Number.isSafeInteger(originalProrationAmount) || originalProrationAmount < 0) {
      throw new Error("Invalid deferred billing schedule");
    }
  }

  return { pausedAt, pausedDays, originalProrationAmount };
}

// Use UTC midnight to count whole days, even when daylight saving time changes the day length.
function calendarDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Choose a valid first payment date");
  }
  return date;
}

/** Validate the first payment date and calculate the extra charge for access before that date. */
export function createDeferredBilling(input: {
  delayFirstPayment?: boolean; firstPaymentDate?: string; prorateBeforeFirstPayment?: boolean;
  startDate: Date; cancelAt?: Date | null; timezone: string; price: number;
  interval: Interval; intervalThreshold: number; trialDays?: number; now?: Date;
}): DeferredBilling | null {
  if (!input.delayFirstPayment) {
    if (input.firstPaymentDate || input.prorateBeforeFirstPayment) throw new Error("Enable Choose Different Billing Date before choosing a billing date");
    return null;
  }
  if (input.trialDays) throw new Error("A delayed first payment cannot be combined with trial days");
  const date = calendarDate(input.firstPaymentDate ?? "");
  // Collection starts at 9 a.m. in the location timezone on the selected billing date.
  const firstPaymentAt = fromZonedTime(`${input.firstPaymentDate}T09:00:00`, input.timezone);
  const accessStartDate = formatInTimeZone(input.startDate, input.timezone, "yyyy-MM-dd");
  const access = calendarDate(accessStartDate);
  if (date <= access || firstPaymentAt <= (input.now ?? new Date())) throw new Error("First payment must be after access starts and in the future");
  if (input.cancelAt && firstPaymentAt >= input.cancelAt) throw new Error("First payment must be before the subscription ends");
  if (!Number.isSafeInteger(input.intervalThreshold) || input.intervalThreshold < 1) throw new Error("Invalid billing interval");
  const prorationAmount = input.prorateBeforeFirstPayment
    ? calculateProrationAmount(input.price, access, date, input.interval, input.intervalThreshold)
    : 0;
  return { version: 1, firstPaymentAt: firstPaymentAt.toISOString(),
    prorate: !!input.prorateBeforeFirstPayment, prorationAmount };
}

function calculateProrationAmount(price: number, access: Date, date: Date, interval: Interval, threshold: number) {
  // Calculate the length of one billing period ending on the first payment date.
  // If the previous month has fewer days, use its last day. For example, March 31 goes back to February 28.
  const previous = new Date(date);
  if (interval === "month" || interval === "year") {
    const month = date.getUTCMonth() - threshold * (interval === "year" ? 12 : 1);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0)).getUTCDate();
    previous.setUTCFullYear(date.getUTCFullYear(), month, Math.min(date.getUTCDate(), lastDay));
  } else {
    previous.setUTCDate(date.getUTCDate() - threshold * (interval === "week" ? 7 : 1));
  }
  // Extra charge = regular price × early access days / days in a full billing period. Round once to cents.
  const prorationAmount = Math.round(price * (date.getTime() - access.getTime()) / (date.getTime() - previous.getTime()));
  if (!Number.isSafeInteger(prorationAmount) || prorationAmount < 0 || prorationAmount > 2_147_483_647) throw new Error("Prorated amount is out of range");
  return prorationAmount;
}

/** Find the next billing date in the location timezone, keeping the same local time across daylight saving changes. */
export function nextDeferredBillingBoundary(schedule: DeferredBilling, periodStart: Date, interval: Interval, threshold: number, timezone: string) {
  // Copy the local date and time into a temporary UTC date so the shared helper can do calendar calculations.
  const local = (date: Date) => new Date(`${formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ss.SSS")}Z`);
  const next = nextBillingBoundary(local(new Date(schedule.firstPaymentAt)), local(periodStart), interval, threshold);
  return fromZonedTime(next.toISOString().slice(0, 23), timezone);
}

/** Check whether this invoice period starts on the chosen first payment date. */
export function isDeferredFirstPeriod(schedule: DeferredBilling | null, periodStart: Date | string) {
  return !!schedule && new Date(periodStart).getTime() === new Date(schedule.firstPaymentAt).getTime();
}

/** Add the early access charge to the first bill only. Later bills use the regular price. */
export function deferredChargeAmount(schedule: DeferredBilling | null, periodStart: Date | string, price: number, downpayment?: number | null) {
  // As in existing billing, a zero downpayment means charge the full regular price.
  return schedule && isDeferredFirstPeriod(schedule, periodStart)
    ? (downpayment || price) + schedule.prorationAmount : price;
}

/** Reduce the early access charge for paused days. Read the access date from the subscription start date. */
export function resumeDeferredBilling(schedule: DeferredBilling, now: Date, timezone: string, startDate: Date): DeferredBilling {
  if (!schedule.pausedAt) return schedule;
  const day = (date: Date) => calendarDate(formatInTimeZone(date, timezone, "yyyy-MM-dd")).getTime();
  const accessStart = day(startDate);
  const firstPayment = day(new Date(schedule.firstPaymentAt));
  // Count paused days only between the access start date and the first payment date. Exclude the payment date itself.
  const pausedStart = Math.max(accessStart, day(new Date(schedule.pausedAt)));
  const pausedEnd = Math.min(firstPayment, day(now));
  const daysInAccess = (firstPayment - accessStart) / 86_400_000;
  if (daysInAccess <= 0) throw new Error("First payment must be after access starts");
  const pausedDays = Math.min(daysInAccess, (schedule.pausedDays ?? 0) + Math.max(0, pausedEnd - pausedStart) / 86_400_000);
  // Always calculate from the original amount so repeated pauses do not add rounding errors.
  const originalProrationAmount = schedule.originalProrationAmount ?? schedule.prorationAmount;
  return {
    ...schedule,
    pausedAt: null,
    pausedDays,
    originalProrationAmount,
    prorationAmount: Math.round(originalProrationAmount * (daysInAccess - pausedDays) / daysInAccess),
  };
}
