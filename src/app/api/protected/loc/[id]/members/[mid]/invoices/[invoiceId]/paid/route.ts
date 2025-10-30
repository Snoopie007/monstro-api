import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberInvoices, transactions, memberSubscriptions } from "@/db/schemas";
import { eq, and } from "drizzle-orm";
import { addMonths, addWeeks, addDays, addYears } from "date-fns";

type MarkPaidProps = {
	id: string;
	mid: string;
	invoiceId: string;
};

export async function POST(
	req: NextRequest,
	props: { params: Promise<MarkPaidProps> }
) {
	const params = await props.params;

	try {
		const body = await req.json();
		const { paidAmount, paidDate, paymentMethod = "cash", notes } = body;

		// Validate required fields
		if (!paidAmount) {
			return NextResponse.json(
				{ error: "Paid amount is required" },
				{ status: 400 }
			);
		}

		// Get invoice
		const invoice = await db.query.memberInvoices.findFirst({
			where: eq(memberInvoices.id, params.invoiceId),
		});

		if (!invoice) {
			return NextResponse.json(
				{ error: "Invoice not found" },
				{ status: 404 }
			);
		}

		// Only allow manual or cash invoices (both require manual payment confirmation)
		if (invoice.paymentMethod !== "manual" && invoice.paymentMethod !== "cash") {
			return NextResponse.json(
				{ error: "Only manual or cash invoices can be marked paid via this endpoint" },
				{ status: 400 }
			);
		}

		// Validate invoice is in "sent" status
		if (invoice.status !== "sent") {
			return NextResponse.json(
				{ error: "Invoice must be sent before marking as paid" },
				{ status: 400 }
			);
		}

		// Get current user from session/auth context
		// TODO: Get actual user ID from auth session
		const currentUserId = "system"; // Placeholder - implement proper auth

		// Transaction: update invoice + UPDATE existing incomplete transaction + update subscription
		await db.transaction(async (tx) => {
			// Update invoice status to "paid"
			await tx
				.update(memberInvoices)
				.set({
					status: "paid",
					paid: true,
					updated: new Date(),
				})
				.where(eq(memberInvoices.id, params.invoiceId));

			// UPDATE the existing incomplete transaction (don't create new one)
			await tx
				.update(transactions)
				.set({
					status: "paid",
					paymentMethod: paymentMethod,
					chargeDate: paidDate ? new Date(paidDate) : new Date(),
					updated: new Date(),
					metadata: {
						notes: notes || "",
						confirmedBy: currentUserId,
						markedPaidAt: new Date().toISOString(),
					},
				})
				.where(
					and(
						eq(transactions.invoiceId, params.invoiceId),
						eq(transactions.status, "incomplete")
					)
				);

			// If invoice is linked to a subscription, mark subscription as active AND move billing period forward
			if (invoice.memberSubscriptionId) {
				// Fetch the subscription to get plan details
				const subscription = await tx.query.memberSubscriptions.findFirst({
					where: eq(memberSubscriptions.id, invoice.memberSubscriptionId),
					with: { plan: true },
				});
				
				if (subscription && subscription.plan) {
					// Calculate next billing period based on plan interval
					const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
					let nextPeriodEnd: Date;
					
					const interval = subscription.plan.interval || 'month';
					const intervalThreshold = subscription.plan.intervalThreshold || 1;
					
					switch (interval) {
						case 'day':
							nextPeriodEnd = addDays(currentPeriodEnd, intervalThreshold);
							break;
						case 'week':
							nextPeriodEnd = addWeeks(currentPeriodEnd, intervalThreshold);
							break;
						case 'month':
							nextPeriodEnd = addMonths(currentPeriodEnd, intervalThreshold);
							break;
						case 'year':
							nextPeriodEnd = addYears(currentPeriodEnd, intervalThreshold);
							break;
						default:
							nextPeriodEnd = addMonths(currentPeriodEnd, 1);
					}
					
					// Update subscription: set to active AND move billing period forward
					await tx
						.update(memberSubscriptions)
						.set({
							status: "active",
							currentPeriodStart: currentPeriodEnd, // Next period starts where current ended
							currentPeriodEnd: nextPeriodEnd, // Move to next billing date
							updated: new Date(),
						})
						.where(eq(memberSubscriptions.id, invoice.memberSubscriptionId));
				} else {
					// Fallback: just set to active if we can't calculate next period
					await tx
						.update(memberSubscriptions)
						.set({
							status: "active",
							updated: new Date(),
						})
						.where(eq(memberSubscriptions.id, invoice.memberSubscriptionId));
				}
			}
		});

		return NextResponse.json(
			{
				success: true,
				message: "Invoice marked as paid successfully",
				invoice: {
					id: params.invoiceId,
					status: "paid",
					paid: true,
				},
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("Error marking invoice as paid:", error);
		return NextResponse.json(
			{
				error: "Failed to mark invoice as paid",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
