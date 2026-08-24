import type { InvoiceItem } from "@subtrees/types";

export function getRefundAmounts(total: number, items: InvoiceItem[] | null) {
	const nonRefundableAmount = Math.min(total, (items || []).reduce(
		(sum, item) => item.feeId && item.refundable === false
			? sum + Math.max(0, item.price * item.quantity - (item.discount || 0)) + (item.tax || 0)
			: sum,
		0,
	));

	return {
		refundableAmount: total - nonRefundableAmount,
		nonRefundableAmount,
	};
}
