import type { BundleRefundResponse } from "@/subtrees/types";
import { getRefundCharges } from "./charges";
import { refundCharge } from "./chargeRefund";
import { cancelForRefund, finishCancellation, type BundleRefundInput } from "../cancellation";
import { getBundleSummary } from "../bundleSummary";

type RefundBundlePurchaseResult = { status: "not-found" } | { status: "ok"; value: BundleRefundResponse };

/** Full refund-and-cancel only. Each retry discovers charges afresh, including
 * payments that completed after an earlier cancellation/refund request. */
export async function refundBundle(input: BundleRefundInput): Promise<RefundBundlePurchaseResult> {
  const bundle = await cancelForRefund(input);

  if (!bundle) return { status: "not-found" };

  const cancellationWarnings = await finishCancellation(bundle);
  const charges = await getRefundCharges(input.locationId, bundle);
  const results = await Promise.all(charges.map(refundCharge));

  const purchase = await getBundleSummary(input.locationId, input.purchaseId);

  if (!purchase) throw new Error("Bundle purchase disappeared after cancellation");

  return {
    status: "ok",
    value: {
      purchase,
      charges: results,
      cancellationWarnings,
      unfinished: cancellationWarnings.length > 0 || results.some((charge) => charge.status === "failed" || charge.status === "pending"),
    },
  };
}
