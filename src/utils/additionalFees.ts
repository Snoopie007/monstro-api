import { db } from "@/db/db";
import type { AdditionalFee, AdditionalFeeCheckoutType } from "@/subtrees/types";

export async function getAdditionalFeesForCheckout(
	locationId: string,
	checkoutType: AdditionalFeeCheckoutType,
	billingPhase: "initial" | "renewal" = "initial",
	database: Pick<typeof db, "query"> = db,
): Promise<AdditionalFee[]> {
	const fees = await database.query.additionalFees.findMany({
		where: (fee, { and, eq }) => and(
			eq(fee.locationId, locationId),
			eq(fee.active, true),
		),
		orderBy: (fee, { asc }) => [
			asc(fee.created),
			asc(fee.id),
		],
	});

	return fees.filter((fee) =>
		fee.checkoutTypes.includes(checkoutType)
		&& !(checkoutType === "subscription" && billingPhase === "renewal" && fee.initialChargeOnly),
	);
}
