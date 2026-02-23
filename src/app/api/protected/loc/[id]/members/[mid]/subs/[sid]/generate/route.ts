import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberSubscriptions, memberInvoices, locationState } from "@subtrees/schemas";
import { eq, and } from "drizzle-orm";
import { calculatePeriodEnd, calculateTax } from "../../../../utils";

type GenerateInvoiceProps = {
	id: string;
	mid: string;
	sid: string;
};

export async function POST(
	req: NextRequest,
	props: { params: Promise<GenerateInvoiceProps> }
) {
	const params = await props.params;

	try {
		const location = await db.query.locations.findFirst({
			where: (location, { eq, and }) => and(
				eq(location.id, params.id),
			),
			with: {
				locationState: true,
				taxRates: true,
			}
		});
		if (!location) {
			throw new Error("Location not found");
		}



		// Get subscription with plan and pricing
		const subscription = await db.query.memberSubscriptions.findFirst({
			where: eq(memberSubscriptions.id, params.sid),
			with: { pricing: { with: { plan: true } } },
		});

		if (!subscription) {
			throw new Error("Subscription not found");
		}

		// Validate subscription is active and manual/cash
		if (subscription.status !== "active" && subscription.status !== "past_due") {
			return NextResponse.json(
				{ error: "Subscription must be active or past due" },
				{ status: 400 }
			);
		}

		if (subscription.paymentType !== "cash") {
			return NextResponse.json(
				{ error: "Only manual/cash subscriptions" },
				{ status: 400 }
			);
		}

		// Use pricing for interval calculation
		const interval = subscription.pricing?.interval || "month";
		const intervalThreshold = subscription.pricing?.intervalThreshold || 1;

		// Calculate next billing period
		const nextPeriodStart = subscription.currentPeriodEnd;
		const nextPeriodEnd = calculatePeriodEnd(
			nextPeriodStart,
			interval,
			intervalThreshold
		);

		// Check if invoice already exists for next period
		const existingInvoice = await db.query.memberInvoices.findFirst({
			where: and(
				eq(memberInvoices.memberPlanId, params.sid),
				eq(memberInvoices.status, "draft")
			),
		});

		if (existingInvoice) {
			return NextResponse.json(
				{ error: "Invoice already exists" },
				{ status: 400 }
			);
		}

		// Create invoice and transaction, then update subscription billing dates
		await db.transaction(async (tx) => {

			// Move subscription billing dates forward for next period
			await tx
				.update(memberSubscriptions)
				.set({
					currentPeriodStart: nextPeriodStart,
					currentPeriodEnd: nextPeriodEnd,
					updated: new Date(),
				})
				.where(eq(memberSubscriptions.id, subscription.id));

			return { invoiceId: "123" };
		});

		return NextResponse.json({
			invoiceId: "123",
		},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Error generating invoice:", error);
		return NextResponse.json(
			{
				error: "Failed to generate invoice",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
