import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberInvoices } from "@/db/schemas";
import { eq } from "drizzle-orm";

type SendInvoiceProps = {
	id: string;
	mid: string;
	invoiceId: string;
};

export async function PATCH(
	req: NextRequest,
	props: { params: Promise<SendInvoiceProps> }
) {
	const params = await props.params;

	try {
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
			.where(eq(memberInvoices.id, params.invoiceId));

		return NextResponse.json({
			success: true,
			message: "Invoice marked as sent",
			invoice: {
				id: params.invoiceId,
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
