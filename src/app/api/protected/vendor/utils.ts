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

async function getPaymentPlan(paymentId: number, pkgId: number) {
  const pkg = await admindb.query.monstroPackages.findFirst({
    where: (pkg, { eq }) => eq(pkg.id, pkgId),
    with: {
      paymentPlans: {
        where: (plan, { eq }) => eq(plan.id, paymentId),
      },
    },
  });

  if (!pkg) {
    throw new Error("Package not found");
  }
  return pkg.paymentPlans[0];
}

async function getPlan(planId: number) {
  const p = await admindb.query.monstroPlans.findFirst({
    where: (plan, { eq }) => eq(plan.id, planId),
  });

  if (!p) {
    throw new Error("Plan not found");
  }

  return p;
}

export { chargeWallet, getPaymentPlan, getPlan };
