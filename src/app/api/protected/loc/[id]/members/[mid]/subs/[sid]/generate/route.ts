import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberSubscriptions, memberInvoices, locationState } from "@/db/schemas";
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



		// Get subscription with plan
		const subscription = await db.query.memberSubscriptions.findFirst({
			where: eq(memberSubscriptions.id, params.sid),
			with: { plan: true },
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

		// Calculate next billing period
		const nextPeriodStart = subscription.currentPeriodEnd;
		const nextPeriodEnd = calculatePeriodEnd(
			nextPeriodStart,
			subscription.plan.interval!,
			subscription.plan.intervalThreshold!
		);

		// Check if invoice already exists for next period
		const existingInvoice = await db.query.memberInvoices.findFirst({
			where: and(
				eq(memberInvoices.memberSubscriptionId, params.sid),
				eq(memberInvoices.status, "draft")
			),
		});

		if (existingInvoice) {
			return NextResponse.json(
				{ error: "Invoice already exists" },
				{ status: 400 }
			);
		}


		const tax = calculateTax(subscription.plan.price, location.taxRates);

		// // Use same utility functions as subscription creation
		// const newTransaction = createTransaction(
		//   subscription.plan,
		//   {
		//     memberId: params.mid,
		//     locationId: params.id,
		//     paymentType: subscription.paymentType,
		//   },
		//   tax
		// );

		// const newInvoice = {
		//   ...createInvoice(
		//     subscription.plan,
		//     {
		//       memberId: params.mid,
		//       locationId: params.id,
		//       paymentType: subscription.paymentType,
		//     },
		//     tax
		//   ),
		//   forPeriodStart: nextPeriodStart,
		//   forPeriodEnd: nextPeriodEnd,
		//   dueDate: nextPeriodEnd,
		//   memberSubscriptionId: subscription.id,
		//   invoiceType: "recurring" as const,
		//   paymentMethod: "manual" as const,
		// };

		// Create invoice and transaction, then update subscription billing dates
		await db.transaction(async (tx) => {
			// const [{ invoiceId }] = await tx
			//   .insert(memberInvoices)
			//   .values({

			//     status: "draft",
			//     memberSubscriptionId: subscription.id,
			//   }).returning({ invoiceId: memberInvoices.id });

			// await tx.insert(transactions).values({
			//   ...newTransaction,
			//   invoiceId,
			//   subscriptionId: subscription.id,
			//   status: "incomplete",
			//   paymentType: subscription.paymentType,
			// });

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

