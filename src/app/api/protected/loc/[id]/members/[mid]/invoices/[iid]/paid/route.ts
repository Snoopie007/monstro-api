import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberInvoices, transactions, memberSubscriptions, locationState, members, locations } from "@subtrees/schemas";
import { eq, and } from "drizzle-orm";
import { addMonths, addWeeks, addDays, addYears } from "date-fns";
import { serversideApiClient } from "@/libs/api/server";

type MarkPaidProps = {
	id: string;
	mid: string;
	iid: string;
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
			where: eq(memberInvoices.id, params.iid),
		});

		if (!invoice) {
			return NextResponse.json(
				{ error: "Invoice not found" },
				{ status: 404 }
			);
		}

		// Only allow manual or cash invoices (both require manual payment confirmation)
		if (invoice.paymentType !== "cash") {
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
				.where(eq(memberInvoices.id, params.iid));

			// UPDATE the existing incomplete transaction (don't create new one)
			await tx
				.update(transactions)
				.set({
					status: "paid",
					paymentType: paymentMethod,
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
						eq(transactions.invoiceId, params.iid),
						eq(transactions.status, "incomplete")
					)
				);

			// If invoice is linked to a subscription, mark subscription as active AND move billing period forward
			if (invoice.memberSubscriptionId) {
				// Fetch the subscription to get plan and pricing details
				const subscription = await tx.query.memberSubscriptions.findFirst({
					where: eq(memberSubscriptions.id, invoice.memberSubscriptionId),
					with: { pricing: { with: { plan: true } } },
				});

				if (subscription && subscription.pricing) {
					// Calculate next billing period based on pricing interval (fallback to defaults)
					const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
					let nextPeriodEnd: Date;

					// Use pricing.interval if available, otherwise default to month
					const interval = subscription.pricing?.interval || 'month';
					const intervalThreshold = subscription.pricing?.intervalThreshold || 1;

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
					// Handle make-up credits carry-over (reset if not allowed)
					const makeUpCreditsValue = subscription.allowMakeUpCarryOver 
						? subscription.makeUpCredits // Keep current credits
						: 0; // Reset to 0
					
					await tx
						.update(memberSubscriptions)
						.set({
							status: "active",
							currentPeriodStart: currentPeriodEnd, // Next period starts where current ended
							currentPeriodEnd: nextPeriodEnd, // Move to next billing date
							makeUpCredits: makeUpCreditsValue,
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

		// Send payment successful email (only for cash, plan_id >= 2)
		if (invoice.paymentType === "cash") {
			try {
				// Check if location has plan_id >= 2
				const locState = await db.query.locationState.findFirst({
					where: eq(locationState.locationId, params.id)
				});

				if (locState?.planId && locState.planId >= 2) {
					// Fetch member and location details
					const member = await db.query.members.findFirst({
						where: eq(members.id, params.mid)
					});

					const location = await db.query.locations.findFirst({
						where: eq(locations.id, params.id)
					});

					if (member && location) {
						const apiClient = serversideApiClient();
						await apiClient.post('/x/email/send', {
							recipient: member.email,
							subject: 'Payment Received - Thank You',
							template: 'PaymentSuccessEmail',
							data: {
								member: {
									firstName: member.firstName || '',
									lastName: member.lastName || ''
								},
								invoice: {
									id: invoice.id,
									total: invoice.total,
									paidDate: paidDate || new Date().toISOString(),
									description: invoice.description || 'Payment'
								},
								location: {
									name: location.name || '',
									address: location.address || ''
								},
								monstro: {
									fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
									privacyUrl: 'https://mymonstro.com/privacy',
									unsubscribeUrl: 'https://mymonstro.com/unsubscribe',
								}
							}
						});
						console.log(`📧 Sent payment success email for invoice ${invoice.id}`);
					}
				}
			} catch (error) {
				console.error('Failed to send payment success email:', error);
				// Don't fail the request if email fails
			}
		}

		return NextResponse.json(
			{
				success: true,
				message: "Invoice marked as paid successfully",
				invoice: {
					id: params.iid,
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
