import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { memberInvoices, members } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { MemberStripePayments } from "@/libs/server/stripe";
import { scheduleOneOffInvoiceReminders } from "../../utils";

type InvoiceProps = {
	mid: string;
	id: string;
};

// Validation schemas
const InvoiceItemSchema = z.object({
	name: z.string().min(1, "Item name is required"),
	description: z.string().optional(),
	quantity: z.number().min(1, "Quantity must be at least 1"),
	price: z.number().min(0, "Price must be non-negative"), // in cents
});

const RecurringSettingsSchema = z.object({
	interval: z.enum(["day", "week", "month", "year"]),
	intervalCount: z.number().min(1).max(12),
	startDate: z.iso.datetime(),
	endDate: z.iso.datetime().optional(),
});

const CreateInvoiceSchema = z
	.object({
		type: z.enum(["one-off", "recurring"]),
		description: z.string().optional(),
		dueDate: z.iso.datetime().optional(),
		collectionMethod: z.enum(["charge_automatically", "send_invoice"]),

		items: z.array(InvoiceItemSchema).min(1, "At least one item is required"),
		isRecurring: z.boolean(),
		recurringSettings: RecurringSettingsSchema.optional(),
	})
	.refine(
		(data) => {
			if (data.type === "recurring" && !data.recurringSettings) {
				return false;
			}
			return true;
		},
		{
			message: "Recurring settings are required for recurring invoices",
			path: ["recurringSettings"],
		}
	);

export async function GET(
	req: Request,
	props: { params: Promise<InvoiceProps> }
) {
	const params = await props.params;
	try {
		const invoices = await db.query.memberInvoices.findMany({
			where: (memberInvoices, { eq, and }) =>
				and(
					eq(memberInvoices.memberId, params.mid),
					eq(memberInvoices.locationId, params.id)
				),
		});

		return NextResponse.json(invoices, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

export async function POST(
	req: NextRequest,
	props: { params: Promise<InvoiceProps> }
) {
	const params = await props.params;

	try {
		const body = await req.json();
		const validatedData = CreateInvoiceSchema.parse(body);
		const {
			type,
			items,
			description,
			dueDate,
			collectionMethod,
			isRecurring,
			recurringSettings,
		} = validatedData;

		// Get member and validate Stripe customer
		const member = await db.query.members.findFirst({
			where: eq(members.id, params.mid),
		});

		if (!member?.stripeCustomerId) {
			return NextResponse.json(
				{
					error: "Member does not have a Stripe customer ID",
				},
				{ status: 400 }
			);
		}


		const integrations = await db.query.integrations.findFirst({
			where: (integrations, { eq, and }) =>
				and(
					eq(integrations.locationId, params.id),
					eq(integrations.service, "stripe")
				),
		});
		if (!integrations || !integrations.accountId) {
			return NextResponse.json(
				{ error: "Stripe integration not found" },
				{ status: 404 }
			);
		}
		const stripe = new MemberStripePayments(integrations.accountId);
		stripe.setCustomer(member.stripeCustomerId);
		let stripeInvoice;
		let localInvoiceData;

		if (type === "one-off") {
			// Create invoice items first
			const invoiceItemIds = [];
			for (const item of items) {
				const invoiceItem = await stripe.createInvoiceItem(
					member.stripeCustomerId,
					{
						amount: item.price * item.quantity, // Total amount in cents
						currency: "usd",
						description: `${item.name}${item.description ? ` - ${item.description}` : ""
							}`,
						metadata: {
							locationId: params.id,
							createdBy: "admin",
							itemName: item.name,
							quantity: item.quantity.toString(),
						},
					}
				);
				invoiceItemIds.push(invoiceItem.id);
			}

			// Create the draft invoice
			stripeInvoice = await stripe.createDraftInvoice(member.stripeCustomerId, {
				collection_method: collectionMethod,
				description: description,
				due_date: dueDate
					? Math.floor(new Date(dueDate).getTime() / 1000)
					: Math.floor(
						new Date(Date.now() + 24 * 60 * 60 * 1000).getTime() / 1000
					),
				pending_invoice_items_behavior: "include", // Explicitly include pending invoice items
				metadata: {
					locationId: params.id,
					memberId: params.mid,
					type: "one-off-admin-created",
					invoiceItemIds: invoiceItemIds.join(","),
				},
			});


			localInvoiceData = {
				memberId: params.mid,
				locationId: params.id,
				description:
					description ||
					`Custom invoice for ${member.firstName} ${member.lastName}`,
				items: items,
				total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
				subtotal: items.reduce(
					(sum, item) => sum + item.price * item.quantity,
					0
				),
				tax: 0, // Default tax amount - can be updated later when tax calculation is implemented
				discount: 0, // Default discount amount - can be updated later when discount calculation is implemented
				currency: "usd",
				status: "draft" as const,
				dueDate: dueDate ? new Date(dueDate) : new Date(),
				metadata: {
					stripeInvoiceId: stripeInvoice.id,
					type: type,
					isRecurring: false,
					collectionMethod: collectionMethod,
					invoiceItemIds: invoiceItemIds,
				},
			};
		} else if (type === "recurring" && recurringSettings) {
			// Create recurring invoice using subscription schedule
			const subscriptionItems = items.map((item) => ({
				price_data: {
					currency: "usd",
					product_data: {
						name: item.name,
						description: item.description,
					},
					unit_amount: item.price,
					recurring: {
						interval: recurringSettings.interval,
						interval_count: recurringSettings.intervalCount || 1,
					},
				},
				quantity: item.quantity,
			}));

			stripeInvoice = await stripe.createRecurringInvoiceSchedule(
				member.stripeCustomerId,
				subscriptionItems,
				new Date(recurringSettings.startDate),
				recurringSettings.endDate
					? new Date(recurringSettings.endDate)
					: undefined
			);

			localInvoiceData = {
				memberId: params.mid,
				locationId: params.id,
				description:
					description ||
					`Recurring invoice for ${member.firstName} ${member.lastName}`,
				items: items,
				total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
				subtotal: items.reduce(
					(sum, item) => sum + item.price * item.quantity,
					0
				),
				tax: 0, // Default tax amount - can be updated later when tax calculation is implemented
				discount: 0, // Default discount amount - can be updated later when discount calculation is implemented
				currency: "usd",
				status: "draft" as const,
				dueDate: new Date(recurringSettings.startDate),
				metadata: {
					stripeScheduleId: stripeInvoice.id,
					type: type,
					isRecurring: true,
					recurringSettings: recurringSettings,
					collectionMethod: collectionMethod,
				},
			};
		}

		// Ensure localInvoiceData is defined
		if (!localInvoiceData) {
			return NextResponse.json(
				{
					error: "Invalid invoice type or missing data",
				},
				{ status: 400 }
			);
		}

		// Store reference in local database
		const [invoice] = await db
			.insert(memberInvoices)
			.values(localInvoiceData)
			.returning();

		if (type === "one-off" && invoice.dueDate) {
			await scheduleOneOffInvoiceReminders(invoice.id, new Date(invoice.dueDate), params.id);
		}

		return NextResponse.json(
			{
				success: true,
				invoice: invoice,
				stripeInvoice: stripeInvoice,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Error creating invoice:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: error.message,
				},
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{
				error: "Failed to create invoice",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
