import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { memberInvoices } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { getStripeCustomer } from "@/libs/server/stripe";

type SendInvoiceProps = {
  id: string;
  mid: string;
  invoiceId: string;
};

export async function POST(
  req: NextRequest,
  props: { params: Promise<SendInvoiceProps> }
) {
  const params = await props.params;

  try {
    // Get local invoice record
    const invoice = await db.query.memberInvoices.findFirst({
      where: eq(memberInvoices.id, params.invoiceId),
      with: {
        member: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        {
          error: "Invoice not found",
        },
        { status: 404 }
      );
    }

    const stripeInvoiceId = invoice.metadata?.stripeInvoiceId;
    const stripeScheduleId = invoice.metadata?.stripeScheduleId;

    if (!stripeInvoiceId && !stripeScheduleId) {
      return NextResponse.json(
        {
          error:
            "Stripe invoice ID or schedule ID not found in invoice metadata",
        },
        { status: 400 }
      );
    }

    // Get Stripe customer instance
    const stripe = await getStripeCustomer({ id: params.id, mid: params.mid });

    let result;
    let invoiceUrl;

    if (stripeInvoiceId) {
      // Handle one-off invoice
      try {
        // Finalize the invoice first
        const finalizedInvoice = await stripe.finalizeInvoice(stripeInvoiceId);

        // Send the invoice if collection method is send_invoice
        if (invoice.metadata?.collectionMethod === "send_invoice") {
          result = await stripe.sendInvoice(stripeInvoiceId);
          invoiceUrl = result.hosted_invoice_url;
        } else {
          // For charge_automatically, just get the finalized invoice
          result = finalizedInvoice;
          invoiceUrl = finalizedInvoice.hosted_invoice_url;
        }

        // Update local record
        await db
          .update(memberInvoices)
          .set({
            status:
              invoice.metadata?.collectionMethod === "send_invoice"
                ? "unpaid" // Changed from "open" to valid enum value
                : "paid",
            metadata: {
              ...invoice.metadata,
              sentAt: new Date().toISOString(),
              invoiceUrl: invoiceUrl,
              finalizedAt: new Date().toISOString(),
              stripeStatus: result.status,
            },
          })
          .where(eq(memberInvoices.id, params.invoiceId));
      } catch (stripeError: any) {
        console.error("Stripe error:", stripeError);
        return NextResponse.json(
          {
            error: "Failed to finalize or send invoice with Stripe",
            details: stripeError.message,
          },
          { status: 500 }
        );
      }
    } else if (stripeScheduleId) {
      // Handle recurring invoice (subscription schedule)
      try {
        // Release the subscription schedule to activate it
        result = await stripe.releaseSubscriptionSchedule(stripeScheduleId);

        // Update local record
        await db
          .update(memberInvoices)
          .set({
            status: "unpaid", // Changed from "active" to valid enum value
            metadata: {
              ...invoice.metadata,
              activatedAt: new Date().toISOString(),
              subscriptionId: result.subscription,
            },
          })
          .where(eq(memberInvoices.id, params.invoiceId));

        invoiceUrl = `https://dashboard.stripe.com/subscriptions/${result.subscription}`;
      } catch (stripeError: any) {
        console.error("Stripe schedule error:", stripeError);
        return NextResponse.json(
          {
            error: "Failed to activate recurring invoice schedule",
            details: stripeError.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: stripeScheduleId
        ? "Recurring invoice activated successfully"
        : "Invoice sent successfully",
      invoiceUrl: invoiceUrl,
      stripeResult: result,
    });
  } catch (error) {
    console.error("Error sending invoice:", error);
    return NextResponse.json(
      {
        error: "Failed to send invoice",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
