import { db } from "@/db/db";
import { additionalFees } from "@subtrees/schemas";
import type { InvoiceItem } from "@subtrees/types";
import { and, eq, inArray } from "drizzle-orm";

export async function getRefundAmounts(
	locationId: string,
	total: number,
	items: InvoiceItem[] | null,
) {
	const transactionItems = items || [];
	const feeIds = new Set<string>();
	for (const item of transactionItems) {
		if (item.kind === "additional_fee" && item.sourceFeeId) {
			feeIds.add(item.sourceFeeId);
		}
	}
	if (feeIds.size === 0) {
		return { refundableAmount: total, nonRefundableAmount: 0 };
	}

	const fees = await db.query.additionalFees.findMany({
		where: and(
			eq(additionalFees.locationId, locationId),
			inArray(additionalFees.id, [...feeIds]),
		),
		columns: { id: true, refundable: true },
	});
	const nonRefundableIds = new Set(
		fees.filter((fee) => !fee.refundable).map((fee) => fee.id),
	);
	let retained = 0;
	for (const item of transactionItems) {
		if (item.kind === "additional_fee"
			&& item.sourceFeeId
			&& nonRefundableIds.has(item.sourceFeeId)) {
			retained += item.price * item.quantity + (item.tax || 0);
		}
	}
	const nonRefundableAmount = Math.min(total, retained);

	return {
		refundableAmount: total - nonRefundableAmount,
		nonRefundableAmount,
	};
}
