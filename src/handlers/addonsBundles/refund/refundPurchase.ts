import type { BundleRefundResponse } from "@/subtrees/types";
import { listBundleRefundCharges } from "./charges";
import { refundOneBundleCharge } from "./chargeRefund";
import { cancelBundleForRefund, finishBundleCancellation, type BundleRefundInput } from "../cancellation";
import { getBundlePurchaseSummary } from "../bundleSummary";

type RefundBundlePurchaseResult = { status: "not-found" } | { status: "ok"; value: BundleRefundResponse };

/** Full refund-and-cancel only. Each retry discovers charges afresh, including
 * payments that completed after an earlier cancellation/refund request. */
export async function refundBundlePurchase(input: BundleRefundInput): Promise<RefundBundlePurchaseResult> {
  const bundle = await cancelBundleForRefund(input);

  if (!bundle) return { status: "not-found" };

  const cancellationWarnings = await finishBundleCancellation(bundle);
  const charges = await listBundleRefundCharges(input.locationId, bundle);
  const results = await Promise.all(charges.map(refundOneBundleCharge));

  const purchase = await getBundlePurchaseSummary(input.locationId, input.purchaseId);

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
