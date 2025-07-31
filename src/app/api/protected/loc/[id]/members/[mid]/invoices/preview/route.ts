import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { members } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { getStripeCustomer } from "@/libs/server/stripe";

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

export async function POST(
  req: NextRequest,
  props: { params: Promise<InvoiceProps> }
) {
  const params = await props.params;

  try {
    const body = await req.json();
    const { items } = PreviewInvoiceSchema.parse(body);
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

    // Get Stripe customer instance
    const stripe = await getStripeCustomer({ id: params.id, mid: params.mid });
    // Prepare invoice items for preview (without creating them)
    const invoiceItems = items.map((item) => ({
      amount: item.price * item.quantity,
      currency: "usd",
      description: `${item.name}${
        item.description ? ` - ${item.description}` : ""
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
      tax_total:
        preview.total_taxes?.reduce((sum, tax) => sum + tax.amount, 0) || 0,
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
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create preview",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
