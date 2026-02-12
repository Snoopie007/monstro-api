import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { auth } from "@/libs/auth/server";
import { eq, sql } from "drizzle-orm";
import { wallets } from "@subtrees/schemas";
import { VendorStripePayments } from "@/libs/server/stripe";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const body = await req.json();

  const { amount, id } = body;

  const stripe = new VendorStripePayments();
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const walletPayment = amount * 100;
    stripe.setCustomer(session?.user.stripeCustomerId ?? '');
    const { clientSecret } = await stripe.createPaymentIntent(
      walletPayment,
      undefined,
      {
        description: `Manual-charge USD ${amount} was successfully added to wallet.`,
      }
    );

    if (!clientSecret) {
      return NextResponse.json({ error: "Payment failed" }, { status: 400 });
    }

    await db
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} + ${amount}`,
        lastCharged: new Date(),
        updated: new Date(),
      })
      .where(eq(wallets.id, id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
