import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { getStripeCustomer, VendorStripePayments } from "@/libs/server/stripe";
import { eq } from "drizzle-orm";
import { memberPackages, transactions } from "@/db/schemas";
import Stripe from "stripe";

type TransactionProps = {
  mid: string;
  id: string;
};

export async function GET(
  req: Request,
  props: { params: Promise<TransactionProps> }
) {
  const params = await props.params;
  try {
    const transactions = await db.query.transactions.findMany({
      where: (transactions, { eq, and }) =>
        and(
          eq(transactions.memberId, params.mid),
          eq(transactions.locationId, params.id)
        ),
    });

    return NextResponse.json(transactions, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<TransactionProps> }
) {
  const params = await props.params;
  const data = await req.json();
  // Validate required fields
  if (!data.chargeId) {
    return NextResponse.json(
      { error: "Transaction ID is required" },
      { status: 400 }
    );
  }

  try {
    const transaction = await db.query.transactions.findFirst({
      where: (transactions, { eq }) =>
        eq(transactions.metadata, { chargeId: data.chargeId }),
      with: {
        invoice: {
          with: {
            subscription: true,
            package: true,
          },
        },
        package: true,
      },
    });

    /**
     * Validate transaction for refund processing
     * 1. Check if transaction exists in the database
     * 2. Verify it hasn't already been refunded
     * 3. Ensure it's an eligible transaction type (incoming payment that's completed)
     */
    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    /**
     * Prevent duplicate refund attempts
     * Each transaction can only be refunded once to avoid double refunds
     */
    if (transaction.refunded) {
      return NextResponse.json(
        { error: "Transaction already refunded" },
        { status: 400 }
      );
    }

    /**
     * Validate refund eligibility
     * Only completed incoming payments can be refunded
     * Outgoing transactions or those with non-completed status (pending, failed) are ineligible
     */
    if (transaction.type !== "inbound" || transaction.status !== "paid") {
      return NextResponse.json(
        { error: "Only completed incoming transactions can be refunded" },
        { status: 400 }
      );
    }

    let stripeRefunded: Stripe.Response<Stripe.Refund> | null = null;
    if (transaction.paymentMethod === "card") {
      if (!transaction.invoice) {
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 }
        );
      }

      // Check if transaction is for a subscription or package
      if (!transaction.invoice.subscription && !transaction.invoice.package) {
        return NextResponse.json(
          {
            error:
              "Invoice must be associated with either a subscription or package",
          },
          { status: 404 }
        );
      }

      // Get the actual Stripe charge ID for refund
      let stripeChargeId: string | null = null;
      // Handle Stripe refunds differently for subscriptions vs packages
      if (transaction.invoice.subscription) {
        // For subscription-based transactions, verify Stripe subscription exists
        const stripeSubscription =
          transaction.invoice.subscription.stripeSubscriptionId;
        if (!stripeSubscription) {
          return NextResponse.json(
            { error: "Stripe subscription not found" },
            { status: 404 }
          );
        }

        // For subscriptions, the charge ID might be in transaction metadata
        stripeChargeId =
          transaction.metadata?.chargeId || transaction.metadata?.charge_id;

        if (!stripeChargeId) {
          return NextResponse.json(
            { error: "Stripe charge ID not found in transaction metadata" },
            { status: 404 }
          );
        }

        // Use customer-based Stripe instance for subscriptions
        const stripe = await getStripeCustomer({
          id: params.id,
          mid: params.mid,
        });
        stripeRefunded = await stripe.refund(stripeChargeId);
      } else if (transaction.invoice.package || transaction.package) {
        stripeChargeId =
          transaction.metadata?.chargeId || transaction.metadata?.charge_id;

        if (!stripeChargeId) {
          return NextResponse.json(
            { error: "Stripe charge ID not found for package transaction" },
            { status: 404 }
          );
        }

        // For package-based transactions, refund directly using charge ID
        // without needing a Stripe customer, since packages are one-time payments
        const stripe = new VendorStripePayments();
        stripeRefunded = await stripe.refund(stripeChargeId);
      }
    }
    if (stripeRefunded) {
      await db
        .update(transactions)
        .set({ refunded: true })
        .where(eq(transactions.metadata, { chargeId: data.chargeId }));

      // delete the member_package from the member
      // await db
      //   .delete(memberPackages)
      //   .where(eq(memberPackages.memberId, params.mid));
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
