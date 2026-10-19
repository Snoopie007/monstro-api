import { and, eq, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { memberInvoices } from "../../schemas/invoice";
import { transactions } from "../../schemas/transactions";
import {
  commissionAllowanceSchema,
  isAlignedCommissionBasis,
  subscriptionBillingItems,
  type CommissionBasis,
  type CommissionAllowance,
  type InvoiceItem,
} from "../invoiceItems";

type InvoiceDatabase = Pick<PostgresJsDatabase, "select">;

type SubscriptionInvoiceScope = {
  subscriptionId: string;
  memberId: string;
  locationId: string;
  currency?: string;
};

type StoredInvoice = Pick<
  typeof memberInvoices.$inferSelect,
  | "id"
  | "transactionId"
  | "memberPlanId"
  | "memberSubscriptionAddonId"
  | "currency"
  | "subTotal"
  | "tax"
  | "total"
  | "forPeriodStart"
  | "forPeriodEnd"
  | "metadata"
> & { items: readonly InvoiceItem[] | null };

type SubscriptionBillingPeriod = {
  forPeriodStart: Date | null;
  forPeriodEnd: Date | null;
  serviceAmountMinor: number;
  tax: number;
  total: number;
  commissionBasis: CommissionBasis | null;
};

type SubscriptionInvoiceBilling = {
  invoiceId: string;
  transactionId: string | null;
  currency: string | null;
  representation: "direct" | "items";
  periods: SubscriptionBillingPeriod[];
};

export function readSubscriptionInvoice(
  invoice: StoredInvoice,
  subscriptionId: string,
): SubscriptionInvoiceBilling | null {
  const identity = {
    invoiceId: invoice.id,
    transactionId: invoice.transactionId,
    currency: invoice.currency,
  };

  if (invoice.memberPlanId !== null) {
    if (invoice.memberPlanId !== subscriptionId) return null;

    const basis = commissionAllowanceSchema.safeParse({
      visitAllowance: invoice.metadata?.commissionVisitAllowance,
      allowanceInterval: invoice.metadata?.commissionAllowanceInterval,
      billingInterval: invoice.metadata?.commissionBillingInterval,
      billingThreshold: invoice.metadata?.commissionBillingThreshold,
    });

    return {
      ...identity,
      representation: "direct",
      periods: [
        {
          forPeriodStart: invoice.forPeriodStart,
          forPeriodEnd: invoice.forPeriodEnd,
          serviceAmountMinor: invoice.subTotal,
          tax: invoice.tax,
          total: invoice.total,
          commissionBasis: basis.success
            ? { type: "allowance", ...basis.data }
            : null,
        },
      ],
    };
  }

  if (invoice.memberSubscriptionAddonId !== null) return null;

  const items = subscriptionBillingItems(invoice.items, subscriptionId);
  if (!items.length) return null;

  const periods = new Map<string, SubscriptionBillingPeriod>();
  const servicePeriods = new Set<string>();

  for (const item of items) {
    const billing = item.billing;
    const start = new Date(billing.forPeriodStart);
    const end =
      billing.forPeriodEnd === null ? null : new Date(billing.forPeriodEnd);
    const key = `${start.getTime()}/${end?.getTime() ?? ""}`;
    let period = periods.get(key);

    if (!period) {
      period = {
        forPeriodStart: start,
        forPeriodEnd: end,
        serviceAmountMinor: 0,
        tax: 0,
        total: 0,
        commissionBasis: null,
      };
      periods.set(key, period);
    }

    // Additional fees belong to the component total, but never its service value.
    if (!item.feeId) {
      const basis = billing.commissionBasis ?? null;

      if (
        servicePeriods.has(key) &&
        JSON.stringify(period.commissionBasis) !== JSON.stringify(basis)
      ) {
        throw new Error(
          `Invoice ${invoice.id} has conflicting commission bases`,
        );
      }

      servicePeriods.add(key);
      period.commissionBasis = basis;
      period.serviceAmountMinor += billing.subTotal;
    }

    period.tax += billing.tax;
    period.total += billing.total;

    if (
      ![period.serviceAmountMinor, period.tax, period.total].every(
        Number.isSafeInteger,
      )
    ) {
      throw new Error(
        `Invoice ${invoice.id} component amounts exceed safe integer limits`,
      );
    }
  }

  return {
    ...identity,
    representation: "items",
    periods: [...periods.values()],
  };
}

function subscriptionInvoiceWhere(scope: SubscriptionInvoiceScope) {
  return and(
    eq(memberInvoices.memberId, scope.memberId),
    eq(memberInvoices.locationId, scope.locationId),
    scope.currency
      ? sql`upper(${memberInvoices.currency}) = ${scope.currency.toUpperCase()}`
      : undefined,
    or(
      eq(memberInvoices.memberPlanId, scope.subscriptionId),
      and(
        isNull(memberInvoices.memberPlanId),
        isNull(memberInvoices.memberSubscriptionAddonId),
        sql`exists (
        select 1 from unnest(${memberInvoices.items}) as item
        where item->>'sourceId' = ${scope.subscriptionId}
      )`,
      ),
    ),
  );
}

/** Cash/manual historical payments need only paid=true, as the original counters did. */
export async function countPaidSubscriptionInvoices(
  db: InvoiceDatabase,
  scope: SubscriptionInvoiceScope,
): Promise<number> {
  const invoices = await db
    .select()
    .from(memberInvoices)
    .where(and(subscriptionInvoiceWhere(scope), eq(memberInvoices.paid, true)));

  return invoices.filter((invoice) => readSubscriptionInvoice(invoice, scope.subscriptionId)).length;
}

/** Component snapshots are authoritative. The supplied legacy basis/fallback only
 * applies to scalar invoices and subscriptions without an item billing record. */
export async function getSubscriptionCommissionValue(
  db: InvoiceDatabase,
  input: {
    scope: SubscriptionInvoiceScope & { currency: string };
    at: Date;
    legacyBasis: CommissionAllowance | null;
    fallbackSessionValueMinor: number | null;
  },
) {
  const rows = await db
    .select({ invoice: memberInvoices, transaction: transactions })
    .from(memberInvoices)
    .leftJoin(transactions, eq(transactions.id, memberInvoices.transactionId))
    .where(subscriptionInvoiceWhere({ ...input.scope, currency: undefined }));

  const covered: Array<{
    invoice: SubscriptionInvoiceBilling;
    period: SubscriptionBillingPeriod;
    transactionId: string;
    transactionCurrency: string;
  }> = [];
  let hasComponentInvoices = false;
  let hasComponentPeriod = false;

  for (const row of rows) {
    const invoice = readSubscriptionInvoice(
      row.invoice,
      input.scope.subscriptionId,
    );
    if (!invoice) continue;

    if (invoice.representation === "items") hasComponentInvoices = true;

    for (const period of invoice.periods) {
      if (
        !period.forPeriodStart ||
        !period.forPeriodEnd ||
        input.at < period.forPeriodStart ||
        input.at >= period.forPeriodEnd
      ) {
        continue;
      }

      if (invoice.representation === "items") hasComponentPeriod = true;

      const transaction = row.transaction;
      if (
        !row.invoice.paid ||
        row.invoice.status !== "paid" ||
        !transaction ||
        transaction.status !== "paid" ||
        transaction.type !== "inbound" ||
        transaction.memberId !== input.scope.memberId ||
        transaction.locationId !== input.scope.locationId
      ) {
        continue;
      }

      covered.push({
        invoice,
        period,
        transactionId: transaction.id,
        transactionCurrency: transaction.currency,
      });
    }
  }

  if (hasComponentInvoices && covered.length === 0) return null;

  const aligned = isAlignedCommissionBasis(input.legacyBasis);
  if (!hasComponentPeriod && !aligned) {
    return input.fallbackSessionValueMinor === null
      ? null
      : {
          serviceAmountMinor: input.fallbackSessionValueMinor,
          visitAllowance: 1,
          snapshot: {
            aligned: false,
            sessionCommissionValueMinor: input.fallbackSessionValueMinor,
          },
        };
  }

  if (covered.length !== 1) return null;

  const { invoice, period, transactionId, transactionCurrency } = covered[0]!;

  if (
    invoice.currency?.toUpperCase() !== input.scope.currency.toUpperCase() ||
    transactionCurrency.toUpperCase() !== input.scope.currency.toUpperCase()
  ) {
    return null;
  }

  const basis = period.commissionBasis;
  if (!basis || basis.type === "unavailable") return null;
  if (basis.type === "allowance" && !isAlignedCommissionBasis(basis)) {
    return null;
  }

  const serviceAmountMinor =
    basis.type === "fixed"
      ? basis.sessionValueMinor
      : period.serviceAmountMinor;
  const visitAllowance = basis.type === "fixed" ? 1 : basis.visitAllowance;

  return {
    serviceAmountMinor,
    visitAllowance,
    snapshot: {
      aligned: basis.type === "allowance",
      invoiceId: invoice.invoiceId,
      transactionId,
      periodStart: period.forPeriodStart!,
      periodEnd: period.forPeriodEnd!,
      ...(basis.type === "fixed"
        ? { sessionCommissionValueMinor: basis.sessionValueMinor }
        : {
            originalAllowance: basis.visitAllowance,
            allowanceInterval: basis.allowanceInterval,
            billingInterval: basis.billingInterval,
            billingThreshold: basis.billingThreshold,
          }),
      serviceAmountMinor,
    },
  };
}
