import { NextResponse } from "next/server";
import { VendorStripePayments } from "@/libs/server/stripe";
import { auth } from "@/libs/auth/server";
export async function POST(req: Request, props: { params: Promise<{}> }) {

  const session = await auth();
  const { token, default: isDefault } = await req.json();

  try {
    if (!session || !session.user.stripeCustomerId) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    const stripe = new VendorStripePayments();
    stripe.setCustomer(session.user.stripeCustomerId);
    const { paymentMethod } = await stripe.setupIntent(token);
    if (isDefault) {
      await stripe.updateCustomer({
        invoice_settings: {
          default_payment_method: paymentMethod?.id,
        },
      });
    }
    return NextResponse.json(paymentMethod, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
