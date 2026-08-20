import { db } from "@/db/db";
import type { AdditionalFee, AdditionalFeeCheckoutType } from "@subtrees/types";

export async function getAdditionalFeesForCheckout({
	locationId,
	checkoutType,
}: {
	locationId: string;
	checkoutType: AdditionalFeeCheckoutType;
}): Promise<AdditionalFee[]> {
	const fees = await db.query.additionalFees.findMany({
		where: (fee, { and, eq }) => and(
			eq(fee.locationId, locationId),
			eq(fee.active, true),
		),
		orderBy: (fee, { asc }) => [
			asc(fee.sortOrder),
			asc(fee.created),
			asc(fee.id),
		],
	});

	return fees.filter((fee) => fee.checkoutTypes.includes(checkoutType));
}
