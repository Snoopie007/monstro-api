import { db, admindb } from "@/db/db";
import { wallets } from "@/db/schemas/locations";
import { VendorStripePayments } from "@/libs/server/stripe";

async function chargeWallet(
  stripe: VendorStripePayments,
  lid: string,
  token: string | undefined
) {
  const walletPayment = 10 * 100;
  const { clientSecret } = await stripe.createPaymentIntent(
    walletPayment,
    token,
    { description: `Auto-charge $10 USD was successfully added to wallet.` }
  );

  if (!clientSecret) {
    throw new Error("Wallet payment failed");
  }

  await db
    .insert(wallets)
    .values({
      locationId: lid,
      balance: walletPayment,
      credits: 0,
      lastCharged: new Date(),
    })
    .onConflictDoNothing({ target: [wallets.locationId] });
}



async function getPlan(planId: number) {
  const p = await admindb.query.monstroPlans.findFirst({
    where: (plan, { eq }) => eq(plan.id, planId),
    columns: {
      benefits: false,
      created: false,
      updated: false,
      description: false,

    },
  });
  if (!p) {
    throw new Error("Plan not found, please contact your sales rep.")
  }
  return p;
}

export { chargeWallet, getPlan };
