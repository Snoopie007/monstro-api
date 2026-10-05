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

/** Missing metadata means ordinary billing; malformed schedules must never fall back to charging normally. */
export function getDeferredBilling(metadata: Record<string, unknown> | null | undefined): DeferredBilling | null {
  const { deferredBilling: raw } = metadata ?? {};
  if (raw === undefined) return null;
  if (!raw || typeof raw !== "object") throw new Error("Invalid deferred billing schedule");

  const {
    version, firstPaymentAt, prorate, prorationAmount,
  } = raw as Record<string, unknown>;

  // JSON metadata is untrusted. Check the required fields before using dates or amounts.
  if (version !== 1 || typeof firstPaymentAt !== "string"
    || typeof prorate !== "boolean" || typeof prorationAmount !== "number") {
    throw new Error("Invalid deferred billing schedule");
  }
  if (!Number.isFinite(new Date(firstPaymentAt).getTime())) {
    throw new Error("Invalid deferred billing schedule");
  }

  // Money is stored in whole cents. Disabling proration must leave no extra charge.
  if (!Number.isSafeInteger(prorationAmount) || prorationAmount < 0 || (!prorate && prorationAmount !== 0)) {
    throw new Error("Invalid deferred billing schedule");
  }

  const pauseFields = getPauseFields(raw as Record<string, unknown>);

  return {
    version, firstPaymentAt, prorate, prorationAmount,
    ...pauseFields,
  };
}

/** Read the optional state accumulated when an initial access period is paused. */
function getPauseFields({ pausedAt, pausedDays, originalProrationAmount }: Record<string, unknown>) {
  // Pause bookkeeping is optional until the first pause; null means no active pause.
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

// Represent a calendar date at UTC midnight so day counts are unaffected by DST.
function calendarDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Choose a valid first payment date");
  }
  return date;
}

/** Calendar-day proration uses the full interval immediately preceding the anchor. */
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
  // Use the interval before the first bill as the proration denominator.
  // Clamp month/year anchors to the last valid day, e.g. March 31 back to February 28.
  const previous = new Date(date);
  if (interval === "month" || interval === "year") {
    const month = date.getUTCMonth() - threshold * (interval === "year" ? 12 : 1);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0)).getUTCDate();
    previous.setUTCFullYear(date.getUTCFullYear(), month, Math.min(date.getUTCDate(), lastDay));
  } else {
    previous.setUTCDate(date.getUTCDate() - threshold * (interval === "week" ? 7 : 1));
  }
  // Charge recurring price × initial access days / full interval days, rounded once to cents.
  const prorationAmount = Math.round(price * (date.getTime() - access.getTime()) / (date.getTime() - previous.getTime()));
  if (!Number.isSafeInteger(prorationAmount) || prorationAmount < 0 || prorationAmount > 2_147_483_647) throw new Error("Prorated amount is out of range");
  return prorationAmount;
}

/** Advance in local wall-clock time so DST does not shift the collection hour. */
export function nextDeferredBillingBoundary(schedule: DeferredBilling, periodStart: Date, interval: Interval, threshold: number, timezone: string) {
  // Temporarily encode local clock fields as UTC for the shared calendar arithmetic.
  const local = (date: Date) => new Date(`${formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ss.SSS")}Z`);
  const next = nextBillingBoundary(local(new Date(schedule.firstPaymentAt)), local(periodStart), interval, threshold);
  return fromZonedTime(next.toISOString().slice(0, 23), timezone);
}

/** The first paid period starts at the chosen billing anchor, after the initial access period. */
export function isDeferredFirstPeriod(schedule: DeferredBilling | null, periodStart: Date | string) {
  return !!schedule && new Date(periodStart).getTime() === new Date(schedule.firstPaymentAt).getTime();
}

/** Add initial-access proration only once; later periods always use the recurring price. */
export function deferredChargeAmount(schedule: DeferredBilling | null, periodStart: Date | string, price: number, downpayment?: number | null) {
  // Preserve the existing convention that a zero downpayment falls back to the full price.
  return schedule && isDeferredFirstPeriod(schedule, periodStart)
    ? (downpayment || price) + schedule.prorationAmount : price;
}

/** Exclude only paused calendar days that overlap access before the first bill. */
export function resumeDeferredBilling(schedule: DeferredBilling, now: Date, timezone: string, startDate: Date): DeferredBilling {
  if (!schedule.pausedAt) return schedule;
  const day = (date: Date) => calendarDate(formatInTimeZone(date, timezone, "yyyy-MM-dd")).getTime();
  const accessStart = day(startDate);
  const firstPayment = day(new Date(schedule.firstPaymentAt));
  // Clip the pause to [access start, first bill), excluding time before access begins.
  const pausedStart = Math.max(accessStart, day(new Date(schedule.pausedAt)));
  const pausedEnd = Math.min(firstPayment, day(now));
  const daysInAccess = (firstPayment - accessStart) / 86_400_000;
  if (daysInAccess <= 0) throw new Error("First payment must be after access starts");
  const pausedDays = Math.min(daysInAccess, (schedule.pausedDays ?? 0) + Math.max(0, pausedEnd - pausedStart) / 86_400_000);
  // Recalculate from the original amount so repeated pauses do not compound rounding.
  const originalProrationAmount = schedule.originalProrationAmount ?? schedule.prorationAmount;
  return {
    ...schedule,
    pausedAt: null,
    pausedDays,
    originalProrationAmount,
    prorationAmount: Math.round(originalProrationAmount * (daysInAccess - pausedDays) / daysInAccess),
  };
}
