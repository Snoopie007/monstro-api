import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { members, memberSubscriptions, integrations } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
import { MemberStripePayments } from "@/libs/server/stripe";

type InvoiceProps = {
	mid: string;
	id: string;
};

// Preview validation schema
const PreviewInvoiceSchema = z.object({
	items: z
		.array(
			z.object({
				name: z.string().min(1),
				description: z.string().optional(),
				quantity: z.number().min(1),
				price: z.number().min(0), // in cents
			})
		)
		.min(1, "At least one item is required"),
});

// From-subscription preview schema
const FromSubscriptionPreviewSchema = z.object({
	type: z.literal('from-subscription'),
	selectedSubscriptionId: z.string(),
});

export async function POST(
	req: NextRequest,
	props: { params: Promise<InvoiceProps> }
) {
	const params = await props.params;

	try {
		const body = await req.json();

		// Handle from-subscription type
		if (body.type === 'from-subscription') {
			const { selectedSubscriptionId } = FromSubscriptionPreviewSchema.parse(body);

			// Fetch subscription with plan and pricing details
			const subscription = await db.query.memberSubscriptions.findFirst({
				where: eq(memberSubscriptions.id, selectedSubscriptionId),
				with: { pricing: { with: { plan: true } } },
			});

			if (!subscription) {
				return NextResponse.json(
					{ error: "Subscription not found" },
					{ status: 404 }
				);
			}

			if (!subscription.pricing) {
				return NextResponse.json(
					{ error: "Subscription pricing not found" },
					{ status: 404 }
				);
			}

			// Get member
			const member = await db.query.members.findFirst({
				where: eq(members.id, params.mid),
			});

			// Build preview from subscription pricing
			const subtotal = subscription.pricing.price; // Already in cents
			const tax = 0; // Can be calculated if needed
			const discount = 0;
			const amountDue = subtotal + tax - discount;

			const formatted_lines = [{
				description: `${subscription.pricing?.plan?.name ?? 'Unknown Plan'}${subscription.pricing?.plan?.description ? ` - ${subscription.pricing.plan.description}` : ''}`,
				amount: subscription.pricing.price,
				quantity: 1,
				currency: subscription.pricing.currency || "usd"
			}];

			return NextResponse.json({
				success: true,
				preview: {
					subtotal,
					tax_total: tax,
					amount_due: amountDue,
					currency: subscription.pricing.currency || "usd",
					formatted_lines,
					customer_info: {
						name: `${member?.firstName} ${member?.lastName}`,
						email: member?.email
					},
					preview_metadata: {
						generated_at: new Date().toISOString(),
						items_count: 1,
						type: "from-subscription",
						subscription_id: subscription.id,
						payment_type: subscription.paymentType
					}
				},
				summary: {
					total_items: 1,
					subtotal_cents: subtotal,
					tax_cents: tax,
					discount_cents: discount,
					total_cents: amountDue,
					currency: subscription.pricing?.plan?.currency || "usd"
				}
			});
		}

		// Regular items-based preview
		const { items } = PreviewInvoiceSchema.parse(body);
		// Get member and validate Stripe customer
		const member = await db.query.members.findFirst({
			where: eq(members.id, params.mid),
		});
		// Get Stripe customer instance
		const integration = await db.query.integrations.findFirst({
			where: (integrations, { eq, and }) =>
				and(
					eq(integrations.locationId, params.id),
					eq(integrations.service, "stripe")
				),
		});

		if (!member?.stripeCustomerId || !integration || !integration.accountId) {

			// Calculate totals
			const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
			const tax = body.tax || 0;
			const discount = body.discount || 0;
			const amountDue = subtotal + tax - discount;

			// Format line items
			const formatted_lines = items.map(item => ({
				description: `${item.name}${item.description ? ` - ${item.description}` : ''}`,
				amount: item.price * item.quantity,
				quantity: item.quantity,
				currency: "usd"
			}));

			// Build response matching Stripe structure
			return NextResponse.json({
				success: true,
				preview: {
					subtotal,
					tax_total: tax,
					amount_due: amountDue,
					currency: "usd",
					formatted_lines,
					customer_info: {
						name: `${member?.firstName} ${member?.lastName}`,
						email: member?.email
					},
					preview_metadata: {
						generated_at: new Date().toISOString(),
						items_count: items.length,
						type: "manual",
						payment_type: body.paymentType || "cash"
					}
				},
				summary: {
					total_items: items.length,
					subtotal_cents: subtotal,
					tax_cents: tax,
					discount_cents: discount,
					total_cents: amountDue,
					currency: "usd"
				}
			});
		}

		if (!integration || !integration.accountId) {
			return NextResponse.json(
				{ error: "Stripe integration not found" },
				{ status: 404 }
			);
		}

		const stripe = new MemberStripePayments(integration.accountId);
		stripe.setCustomer(member.stripeCustomerId);
		// Prepare invoice items for preview (without creating them)
		const invoiceItems = items.map((item) => ({
			amount: item.price * item.quantity,
			currency: "usd",
			description: `${item.name}${item.description ? ` - ${item.description}` : ""
				}`,
			metadata: {
				temporary: "true",
				previewOnly: "true",
			},
		}));

		// Generate preview with invoice items
		const preview = await stripe.previewInvoice(
			member.stripeCustomerId,
			invoiceItems
		);

		// Create enhanced preview data for better UI display
		const enhancedPreview = {
			...preview,
			// Add computed totals for display
			subtotal: preview.subtotal || preview.amount_due || 0,
			tax_total: preview.total_taxes?.reduce((sum: number, tax: any) => sum + tax.amount, 0) || 0,
			amount_due: preview.amount_due || 0,
			// Add formatted line items for easier consumption
			formatted_lines:
				preview.lines?.data?.map((line: any) => ({
					id: line.id,
					description: line.description,
					amount: line.amount,
					currency: line.currency,
					quantity: line.quantity,
					metadata: line.metadata,
				})) || [],
			// Add member context
			customer_info: {
				id: member.stripeCustomerId,
				name: `${member.firstName} ${member.lastName}`,
				email: member.email,
			},
			// Add preview metadata
			preview_metadata: {
				generated_at: new Date().toISOString(),
				items_count: items.length,
			},
		};

		return NextResponse.json({
			success: true,
			preview: enhancedPreview,
			summary: {
				total_items: items.length,
				subtotal_cents: enhancedPreview.subtotal,
				tax_cents: enhancedPreview.tax_total,
				total_cents: enhancedPreview.amount_due,
				currency: "usd",
			},
		});
	} catch (error) {
		console.error("Error creating preview:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json({
				error: "Validation failed",
				details: error.message,
			}, { status: 400 });
		}

		return NextResponse.json({
			error: "Failed to create preview",
			details: error instanceof Error ? error.message : "Unknown error",
		}, { status: 500 });
	}
}
