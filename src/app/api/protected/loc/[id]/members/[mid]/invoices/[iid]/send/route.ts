import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberInvoices, locationState, integrations, members, locations } from "@subtrees/schemas";
import { eq, and } from "drizzle-orm";
import { serversideApiClient } from "@/libs/api/server";

type SendInvoiceProps = {
	id: string;
	mid: string;
	iid: string;
};

export async function PATCH(
	req: NextRequest,
	props: { params: Promise<SendInvoiceProps> }
) {
	const params = await props.params;

	try {
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

		// Validate status
		if (invoice.status !== "draft") {
			return NextResponse.json(
				{ error: "Invoice must be draft to mark as sent" },
				{ status: 400 }
			);
		}

		// Update to sent
		await db
			.update(memberInvoices)
			.set({
				status: "sent",
				sentAt: new Date(),
				updated: new Date(),
			})
			.where(eq(memberInvoices.id, params.iid));

		// Send invoice reminder email for cash invoices (only for plan_id >= 2, no Stripe)
		if (invoice.paymentType === "cash") {
			try {
				const locState = await db.query.locationState.findFirst({
					where: eq(locationState.locationId, params.id)
				});

				if (locState?.planId && locState.planId >= 2) {
					// Check if location has NO Stripe integration
					const hasStripe = await db.query.integrations.findFirst({
						where: and(
							eq(integrations.locationId, params.id),
							eq(integrations.service, 'stripe')
						)
					});

					if (!hasStripe) {
						// Fetch member and location details
						const member = await db.query.members.findFirst({
							where: eq(members.id, params.mid)
						});

						const location = await db.query.locations.findFirst({
							where: eq(locations.id, params.id)
						});

						if (member && location) {
							const apiClient = serversideApiClient();
							await apiClient.post('/protected/locations/email', {
								recipient: member.email || '',
								subject: `Invoice: ${invoice.description}`,
								template: 'InvoiceReminderEmail',
								data: {
									member: {
										firstName: member.firstName || '',
										lastName: member.lastName || '',
										email: member.email || '',
									},
									invoice: {
										id: invoice.id,
										total: invoice.total,
										dueDate: invoice.dueDate?.toISOString() || new Date().toISOString(),
										description: invoice.description || 'Invoice',
										items: invoice.items || [],
									},
									location: {
										name: location.name || '',
										address: location.address || '',
									},
									monstro: {
										fullAddress: 'PO Box 123, City, State 12345\nCopyright 2025 Monstro',
										privacyUrl: 'https://mymonstro.com/privacy',
										unsubscribeUrl: 'https://mymonstro.com/unsubscribe',
									},
								}
							});
							console.log(`📧 Sent invoice reminder email for invoice ${invoice.id}`);
						}
					}
				}
			} catch (error) {
				console.error('Failed to send invoice reminder email:', error);
				// Don't fail the request if email fails
			}
		}

		return NextResponse.json({
			success: true,
			message: "Invoice marked as sent",
			invoice: {
				id: params.iid,
				status: "sent",
			},
		});
	} catch (error) {
		console.error("Error marking invoice as sent:", error);
		return NextResponse.json(
			{
				error: "Failed to mark invoice as sent",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
