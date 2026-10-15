import { z } from "zod";

const money = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const identifier = z.string().min(1);
const interval = z.enum(["day", "week", "month", "year"]);

export const commissionAllowanceSchema = z.object({
  visitAllowance: z.number().int().positive(),
  allowanceInterval: interval,
  billingInterval: interval,
  billingThreshold: z.number().int().positive(),
});
export type CommissionAllowance = z.infer<typeof commissionAllowanceSchema>;

/** Enrollment freezes the commission allowance and cadence for later invoices. */
export function commissionBillingSnapshot(
  plan: { classLimitInterval: string | null; totalClassLimit: number | null },
  pricing: { interval: string | null; intervalThreshold: number | null },
) {
  return {
    allowanceInterval: plan.classLimitInterval, billingInterval: pricing.interval,
    billingThreshold: pricing.intervalThreshold, visitAllowance: plan.totalClassLimit,
  };
}

export const commissionBasisSchema = z.discriminatedUnion("type", [
  commissionAllowanceSchema.extend({ type: z.literal("allowance") }),
  z.object({ type: z.literal("fixed"), sessionValueMinor: money }),
  z.object({ type: z.literal("unavailable") }),
]);
export type CommissionBasis = z.infer<typeof commissionBasisSchema>;

export function isAlignedCommissionBasis(
  basis: CommissionAllowance | null,
): basis is CommissionAllowance {
  return (
    basis !== null &&
    basis.allowanceInterval === basis.billingInterval &&
    basis.billingThreshold === 1
  );
}

const itemFields = {
  name: z.string(),
  quantity: z.number(),
  price: z.number(),
  productId: z.string().optional(),
  discount: z.number().optional(),
  tax: z.number().optional(),
  feeId: z.string().optional(),
  refundable: z.boolean().optional(),
};

const bundlePricing = z.object({
  type: z.literal("bundle"),
  bundlePurchaseId: identifier,
  bundleComponentId: identifier,
});

const subscriptionFields = {
  sourceType: z.literal("subscription"),
  sourceId: identifier,
  pricingSource: z.discriminatedUnion("type", [
    z.object({ type: z.literal("base") }),
    z.object({
      type: z.literal("addon"),
      memberSubscriptionAddonId: identifier,
    }),
    bundlePricing,
  ]),
  basePlanPricingId: identifier,
  effectivePlanPricingId: identifier,
};

const addonFields = {
  sourceType: z.literal("subscription_addon"),
  sourceId: identifier,
  pricingSource: z.discriminatedUnion("type", [
    z.object({ type: z.literal("addon"), addonId: identifier }),
    bundlePricing,
  ]),
  basePlanPricingId: z.never().optional(),
  effectivePlanPricingId: z.never().optional(),
};

// Scalar-linked invoices already hold these values on the invoice. A combined
// invoice must store them on every attributed service and fee line instead.
export const itemBillingSchema = z
  .object({
    subTotal: money,
    tax: money,
    total: money,
    forPeriodStart: z.iso.datetime({ offset: true }),
    forPeriodEnd: z.iso.datetime({ offset: true }).nullable(),
    commissionBasis: commissionBasisSchema.optional(),
  })
  .refine(
    (value) => value.total === value.subTotal + value.tax,
    "Line total must equal subtotal plus tax",
  )
  .refine(
    (value) =>
      value.forPeriodEnd === null ||
      Date.parse(value.forPeriodEnd) > Date.parse(value.forPeriodStart),
    "Billing period must end after it starts",
  );
export type ItemBilling = z.infer<typeof itemBillingSchema>;

export const invoiceItemSchema = z
  .union([
    z.object({
      ...itemFields,
      sourceType: z.never().optional(),
      sourceId: z.never().optional(),
      pricingSource: z.never().optional(),
      basePlanPricingId: z.never().optional(),
      effectivePlanPricingId: z.never().optional(),
      billing: z.never().optional(),
    }),
    z.object({
      ...itemFields,
      ...subscriptionFields,
      billing: itemBillingSchema.optional(),
    }),
    z.object({
      ...itemFields,
      ...addonFields,
      billing: itemBillingSchema.optional(),
    }),
  ])
  .superRefine((item, context) => {
    if (!item.billing) return;

    const discount = item.discount ?? 0;

    if (
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0 ||
      !Number.isSafeInteger(item.price) ||
      item.price < 0 ||
      !Number.isSafeInteger(discount) ||
      discount < 0 ||
      item.billing.subTotal !== item.price * item.quantity - discount
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Line billing subtotal must equal the item amount after discounts",
      });
    }

    if (item.tax !== undefined && item.tax !== item.billing.tax) {
      context.addIssue({
        code: "custom",
        message: "Line tax must match the billed tax",
      });
    }

    if (item.sourceType === "subscription") {
      if (item.billing.forPeriodEnd === null) {
        context.addIssue({
          code: "custom",
          message: "Subscription billing periods require an end",
        });
      }

      if (!item.feeId && !item.billing.commissionBasis) {
        context.addIssue({
          code: "custom",
          message: "Subscription service lines require a commission basis",
        });
      }

      if (item.feeId && item.billing.commissionBasis) {
        context.addIssue({
          code: "custom",
          message: "Fee lines cannot supply a service commission basis",
        });
      }
    }
  });
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

const sourceProbe = z.object({
  sourceType: z.unknown().optional(),
  sourceId: z.unknown().optional(),
});

/** Ignore unrelated merchandise, but never swallow invalid matching billing data. */
export function subscriptionBillingItems(
  items: readonly InvoiceItem[] | null,
  subscriptionId: string,
) {
  const result: Array<
    Extract<InvoiceItem, { sourceType: "subscription" }> & {
      billing: ItemBilling;
    }
  > = [];

  for (const item of items ?? []) {
    const source = sourceProbe.safeParse(item);
    if (!source.success) continue;

    if (
      source.data.sourceId !== subscriptionId ||
      source.data.sourceType === "subscription_addon"
    ) {
      continue;
    }

    const parsed = invoiceItemSchema.parse(item);

    if (
      parsed.sourceType !== "subscription" ||
      parsed.sourceId !== subscriptionId
    ) {
      throw new Error("Invoice item has conflicting subscription attribution");
    }

    const billing = parsed.billing;
    if (!billing) {
      throw new Error(
        "Combined invoice items require line amounts and billing periods",
      );
    }

    result.push({ ...parsed, billing });
  }

  return result;
}

type BundleInvoiceComponents = {
  subscriptionIds: readonly string[];
  addonPurchaseIds: readonly string[];
};

type InvoiceAmounts = { subTotal: number; tax: number; total: number };

/** A bundle invoice bills each component's service exactly once, on lines that
 * add up to the invoice. Fee lines count toward tax and total, not subtotal,
 * as they do on single-subscription invoices. */
export function assertCompleteBundleInvoice(
  items: readonly InvoiceItem[],
  components: BundleInvoiceComponents,
  amounts: InvoiceAmounts,
) {
  const expectedSources = new Map<
    string,
    "subscription" | "subscription_addon"
  >([
    ...components.subscriptionIds.map((id) => [id, "subscription"] as const),
    ...components.addonPurchaseIds.map(
      (id) => [id, "subscription_addon"] as const,
    ),
  ]);
  const billed = new Set<string>();
  const sums = { subTotal: 0, tax: 0, total: 0 };

  for (const raw of items) {
    const item = invoiceItemSchema.parse(raw);

    if (item.sourceType === undefined || !item.billing) {
      throw new Error(
        "Bundle invoice lines need component attribution and billing",
      );
    }

    if (expectedSources.get(item.sourceId) !== item.sourceType) {
      throw new Error(
        `Bundle invoice bills ${item.sourceType} ${item.sourceId}, which is not part of the purchase`,
      );
    }

    if (!item.feeId) {
      if (billed.has(item.sourceId)) {
        throw new Error(`Bundle invoice bills ${item.sourceId} twice`);
      }

      billed.add(item.sourceId);
      sums.subTotal += item.billing.subTotal;
    }

    sums.tax += item.billing.tax;
    sums.total += item.billing.total;
  }

  const unbilled = [...expectedSources.keys()].filter((id) => !billed.has(id));

  if (unbilled.length) {
    throw new Error(`Bundle invoice does not bill ${unbilled.join(", ")}`);
  }

  if (
    sums.subTotal !== amounts.subTotal ||
    sums.tax !== amounts.tax ||
    sums.total !== amounts.total
  ) {
    throw new Error(
      "Bundle invoice lines do not add up to the invoice amounts",
    );
  }
}

/** The period a combined invoice paid for one add-on purchase. */
export function addonBillingPeriod(
  items: readonly InvoiceItem[] | null,
  addonPurchaseId: string,
): { forPeriodStart: Date; forPeriodEnd: Date | null } {
  for (const raw of items ?? []) {
    const item = invoiceItemSchema.parse(raw);

    if (
      item.sourceType !== "subscription_addon" ||
      item.sourceId !== addonPurchaseId ||
      item.feeId
    ) {
      continue;
    }

    if (!item.billing) {
      throw new Error(`Add-on ${addonPurchaseId} has no billed period`);
    }

    const { forPeriodStart, forPeriodEnd } = item.billing;

    return {
      forPeriodStart: new Date(forPeriodStart),
      forPeriodEnd: forPeriodEnd === null ? null : new Date(forPeriodEnd),
    };
  }

  throw new Error(`Invoice does not bill add-on ${addonPurchaseId}`);
}
