import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { Interval } from "../types/DatabaseEnums";
import { nextBillingBoundary } from "./subscriptionBilling";

export type DeferredBilling = {
  version: 1;
  firstPaymentAt: string;
  accessStartDate: string;
  timezone: string;
  prorate: boolean;
  prorationAmount: number;
  pausedAt?: string | null;
  pausedDays?: number;
  originalProrationAmount?: number;
};

export function getDeferredBilling(metadata: Record<string, unknown> | null | undefined): DeferredBilling | null {
  const raw = metadata?.deferredBilling;
  if (raw === undefined) return null;
  if (!raw || typeof raw !== "object") throw new Error("Invalid deferred billing schedule");
  const value = raw as Record<string, unknown>;
  if (value.version !== 1 || typeof value.firstPaymentAt !== "string"
    || !Number.isFinite(new Date(value.firstPaymentAt).getTime())
    || typeof value.accessStartDate !== "string" || typeof value.timezone !== "string"
    || typeof value.prorate !== "boolean" || typeof value.prorationAmount !== "number"
    || !Number.isSafeInteger(value.prorationAmount) || value.prorationAmount < 0
    || (!value.prorate && value.prorationAmount !== 0)
    || (value.pausedAt != null && (typeof value.pausedAt !== "string" || !Number.isFinite(new Date(value.pausedAt).getTime())))
    || (value.pausedDays !== undefined && (typeof value.pausedDays !== "number" || !Number.isSafeInteger(value.pausedDays) || value.pausedDays < 0))
    || (value.originalProrationAmount !== undefined && (typeof value.originalProrationAmount !== "number" || !Number.isSafeInteger(value.originalProrationAmount) || value.originalProrationAmount < 0))) {
    throw new Error("Invalid deferred billing schedule");
  }
  const access = calendarDate(value.accessStartDate);
  const first = calendarDate(formatInTimeZone(new Date(value.firstPaymentAt), value.timezone, "yyyy-MM-dd"));
  if (first <= access) throw new Error("First payment must be after access starts");
  return {
    version: 1,
    firstPaymentAt: value.firstPaymentAt,
    accessStartDate: value.accessStartDate,
    timezone: value.timezone,
    prorate: value.prorate,
    prorationAmount: value.prorationAmount,
    pausedAt: value.pausedAt,
    pausedDays: value.pausedDays,
    originalProrationAmount: value.originalProrationAmount,
  };
}

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
  const firstPaymentAt = fromZonedTime(`${input.firstPaymentDate}T09:00:00`, input.timezone);
  const accessStartDate = formatInTimeZone(input.startDate, input.timezone, "yyyy-MM-dd");
  const access = calendarDate(accessStartDate);
  if (date <= access || firstPaymentAt <= (input.now ?? new Date())) throw new Error("First payment must be after access starts and in the future");
  if (input.cancelAt && firstPaymentAt >= input.cancelAt) throw new Error("First payment must be before the subscription ends");
  if (!Number.isSafeInteger(input.intervalThreshold) || input.intervalThreshold < 1) throw new Error("Invalid billing interval");
  const previous = new Date(date);
  if (input.interval === "month" || input.interval === "year") {
    const month = date.getUTCMonth() - input.intervalThreshold * (input.interval === "year" ? 12 : 1);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0)).getUTCDate();
    previous.setUTCFullYear(date.getUTCFullYear(), month, Math.min(date.getUTCDate(), lastDay));
  } else {
    previous.setUTCDate(date.getUTCDate() - input.intervalThreshold * (input.interval === "week" ? 7 : 1));
  }
  const prorationAmount = input.prorateBeforeFirstPayment
    ? Math.round(input.price * (date.getTime() - access.getTime()) / (date.getTime() - previous.getTime())) : 0;
  if (!Number.isSafeInteger(prorationAmount) || prorationAmount < 0 || prorationAmount > 2_147_483_647) throw new Error("Prorated amount is out of range");
  return { version: 1, firstPaymentAt: firstPaymentAt.toISOString(), accessStartDate,
    timezone: input.timezone, prorate: !!input.prorateBeforeFirstPayment, prorationAmount };
}

export function nextDeferredBillingBoundary(schedule: DeferredBilling, periodStart: Date, interval: Interval, threshold: number) {
  const local = (date: Date) => new Date(`${formatInTimeZone(date, schedule.timezone, "yyyy-MM-dd'T'HH:mm:ss.SSS")}Z`);
  const next = nextBillingBoundary(local(new Date(schedule.firstPaymentAt)), local(periodStart), interval, threshold);
  return fromZonedTime(next.toISOString().slice(0, 23), schedule.timezone);
}

export function isDeferredFirstPeriod(schedule: DeferredBilling | null, periodStart: Date | string) {
  return !!schedule && new Date(periodStart).getTime() === new Date(schedule.firstPaymentAt).getTime();
}

export function deferredChargeAmount(schedule: DeferredBilling | null, periodStart: Date | string, price: number, downpayment?: number | null) {
  return schedule && isDeferredFirstPeriod(schedule, periodStart)
    ? (downpayment || price) + schedule.prorationAmount : price;
}


/** Exclude only paused calendar days that overlap access before the first bill. */
export function resumeDeferredBilling(schedule: DeferredBilling, now: Date): DeferredBilling {
  if (!schedule.pausedAt) return schedule;
  const day = (date: Date) => calendarDate(formatInTimeZone(date, schedule.timezone, "yyyy-MM-dd")).getTime();
  const accessStart = calendarDate(schedule.accessStartDate).getTime();
  const firstPayment = day(new Date(schedule.firstPaymentAt));
  const pausedStart = Math.max(accessStart, day(new Date(schedule.pausedAt)));
  const pausedEnd = Math.min(firstPayment, day(now));
  const daysInAccess = (firstPayment - accessStart) / 86_400_000;
  const pausedDays = Math.min(daysInAccess, (schedule.pausedDays ?? 0) + Math.max(0, pausedEnd - pausedStart) / 86_400_000);
  const originalProrationAmount = schedule.originalProrationAmount ?? schedule.prorationAmount;
  return {
    ...schedule,
    pausedAt: null,
    pausedDays,
    originalProrationAmount,
    prorationAmount: Math.round(originalProrationAmount * (daysInAccess - pausedDays) / daysInAccess),
  };
}
