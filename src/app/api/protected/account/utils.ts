import { db, admindb } from "@/db/db";
import { wallets } from "@subtrees/schemas/wallets";
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


type NotifyData = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}
// Helper function for external API call
async function notifyAdminAPI(user: NotifyData, locationId: string) {

  try {
    const response = await fetch('https://api.mymonstroapp.com/api/public/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer 4087c1d6-5bb9-47a5-8598-c2a0868c6a78`
      },
      body: JSON.stringify({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        lid: locationId,
      })
    });

    if (!response.ok) {
      throw new Error(`External API returned ${response.status}`);
    }
  } catch (error) {
    // Re-throw to be caught by caller
    throw error;
  }
}
export { chargeWallet, getPlan, notifyAdminAPI };
