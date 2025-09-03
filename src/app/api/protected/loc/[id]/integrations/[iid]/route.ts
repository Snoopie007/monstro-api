import { db } from "@/db/db";
import { integrations } from "@/db/schemas";
import { VendorStripePayments } from "@/libs/server/stripe";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  id: string;
  iid: string;
};

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<Params> }
) {
  const params = await props.params;

  try {
    const integration = await db.query.integrations.findFirst({
      where: (integrations, { eq }) => eq(integrations.id, params.iid),
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    if (integration.service === "stripe") {
      // Validate accountId before attempting to delete from Stripe
      if (!integration.accountId || integration.accountId.trim() === "") {
        console.error("Cannot delete Stripe account: invalid accountId");
        return NextResponse.json(
          { error: "Invalid Stripe account ID: cannot delete from Stripe" },
          { status: 400 }
        );
      }

      const stripe = new VendorStripePayments();
      await stripe.removeAccount(integration.accountId);
    }

    await db.delete(integrations).where(eq(integrations.id, params.iid));

    return NextResponse.json(
      { message: "Integration deleted" },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
