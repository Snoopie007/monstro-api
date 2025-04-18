import { db, admindb } from "@/db/db";
import { VendorStripePayments } from "@/libs/server/stripe";
import { wallet } from "@/db/schemas";



async function chargeWallet(stripe: VendorStripePayments, locationId: number, vendorId: number, token: any) {
    const walletPayment = 10 * 100;
    const { clientSecret } = await stripe.createPaymentIntent(
        walletPayment,
        token.card.id,
        { description: `Auto-charge USD ${walletPayment / 100} was successfully added to wallet.` }
    );

    if (!clientSecret) {
        throw new Error("Wallet payment failed")
    }

    await db.insert(wallet).values({
        locationId: locationId,
        balance: walletPayment / 100,
        credit: 0,
        rechargeAmount: 2500,
        rechargeThreshold: 1000,
        lastCharged: new Date(),
    }).onConflictDoNothing({ target: [wallet.locationId] });

}




async function getPaymentPlan(paymentId: number, pkgId: number) {

    const pkg = await admindb.query.monstroPackages.findFirst({
        where: (pkg, { eq }) => eq(pkg.id, pkgId),
        with: {
            paymentPlans: {
                where: (plan, { eq }) => eq(plan.id, paymentId)
            }
        }
    });

    if (!pkg) {
        throw new Error("Package not found")
    }
    return pkg.paymentPlans[0];


}

async function getPlan(planId: number) {
    const p = await admindb.query.monstroPlans.findFirst({
        where: (plan, { eq }) => eq(plan.id, planId)
    });

    if (!p) {
        throw new Error("Plan not found")
    }

    return p;
}

export { chargeWallet, getPaymentPlan, getPlan }