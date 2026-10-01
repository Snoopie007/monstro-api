import type { CashBilling, CashBillingCycle } from "../types/subscriptionBilling";
import type { MemberInvoice } from "../types/invoices";

type DateValue = Date | string;
type CashSubscription = {
  id: string;
  parentId: string | null;
  paymentType: string | null;
  status: string;
  currentPeriodStart: DateValue | null;
  currentPeriodEnd: DateValue | null;
  startDate: DateValue;
  trialEnd?: DateValue | null;
  cancelAt?: DateValue | null;
};

export type CashInvoice = Pick<MemberInvoice, "id" | "memberPlanId" | "status" | "paid" | "total" | "currency"> & {
  dueDate: DateValue;
  forPeriodStart: DateValue | null;
  forPeriodEnd: DateValue | null;
};

const timestamp = (value: DateValue) => new Date(value).getTime();

export function invoiceMatchesCycle(invoice: Pick<CashInvoice, "dueDate" | "forPeriodStart" | "forPeriodEnd">, cycle: CashBillingCycle) {
  if (invoice.forPeriodStart && invoice.forPeriodEnd) {
    return timestamp(invoice.forPeriodStart) === timestamp(cycle.periodStart)
      && timestamp(invoice.forPeriodEnd) === timestamp(cycle.periodEnd);
  }
  return !invoice.forPeriodStart && !invoice.forPeriodEnd
    && timestamp(invoice.dueDate) === timestamp(cycle.periodEnd);
}

function calendarDay(date: DateValue, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(date));
}

/** Invoice state is derived from columns, never persisted as another billing flag. */
export function resolveCashBilling(
  sub: CashSubscription,
  invoices: CashInvoice[],
  timezone: string,
  now = new Date(),
  selected?: CashBillingCycle & { invoiceId?: string },
): CashBilling | null {
  if (sub.parentId || sub.paymentType !== "cash") return null;
  if (!sub.currentPeriodStart || !sub.currentPeriodEnd) return null;
  const periodStart = new Date(selected?.periodStart ?? sub.currentPeriodStart);
  const periodEnd = new Date(selected?.periodEnd ?? sub.currentPeriodEnd);
  if (!Number.isFinite(periodStart.getTime()) || !Number.isFinite(periodEnd.getTime()) || periodEnd <= periodStart) return null;
  let cycle = { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() };
  const subscriptionInvoices = invoices.filter(invoice => invoice.memberPlanId === sub.id);
  let candidates = subscriptionInvoices.filter(invoice => selected?.invoiceId
    ? invoice.id === selected.invoiceId && invoiceMatchesCycle(invoice, cycle)
    : invoiceMatchesCycle(invoice, cycle));
  // A legacy worker may have advanced the subscription while leaving an older
  // invoice outstanding. Prefer that actual debt over an unrelated future draft.
  if (!selected) {
    const outstanding = subscriptionInvoices.filter(invoice => !invoice.paid
      && ["sent", "unpaid"].includes(invoice.status));
    const oldest = outstanding.sort((a, b) => timestamp(a.dueDate) - timestamp(b.dueDate))[0];
    if (oldest && timestamp(oldest.dueDate) <= timestamp(periodEnd)) {
      candidates = [oldest];
      if (oldest.forPeriodStart && oldest.forPeriodEnd) {
        cycle = { periodStart: new Date(oldest.forPeriodStart).toISOString(), periodEnd: new Date(oldest.forPeriodEnd).toISOString() };
      }
    }
  }
  const invoice = candidates.sort((a, b) => Number(b.paid || b.status === "paid") - Number(a.paid || a.status === "paid"))[0];
  const dueAt = new Date(invoice?.dueDate ?? periodEnd).toISOString();
  const paid = invoice?.paid || invoice?.status === "paid";
  const eligible = ["active", "past_due", "unpaid"].includes(sub.status)
    && timestamp(sub.startDate) <= now.getTime()
    && (!sub.trialEnd || timestamp(sub.trialEnd) <= now.getTime())
    && (!sub.cancelAt || timestamp(sub.cancelAt) > now.getTime());
  const invalidInvoice = invoice && !["draft", "sent", "unpaid", "paid"].includes(invoice.status);
  const state: CashBilling["state"] = paid ? "paid"
    : invalidInvoice || !eligible || (selected?.invoiceId && !invoice) ? "blocked"
    : calendarDay(dueAt, timezone) < calendarDay(now, timezone) ? "overdue"
    : calendarDay(dueAt, timezone) === calendarDay(now, timezone) ? "due" : "scheduled";
  const isCurrentCycle = timestamp(cycle.periodStart) === timestamp(sub.currentPeriodStart)
    && timestamp(cycle.periodEnd) === timestamp(sub.currentPeriodEnd);
  const action: CashBilling["action"] = paid ? null
    : invoice ? state === "blocked" ? "view" : invoice.status === "draft" ? "send" : "collect"
    : eligible && isCurrentCycle && ["due", "overdue"].includes(state) ? "create" : null;
  return {
    ...cycle, dueAt, timezone, state, action,
    invoice: invoice ? { id: invoice.id, status: invoice.status, paid: invoice.paid, total: invoice.total, currency: invoice.currency || "USD" } : null,
  };
}
