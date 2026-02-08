import { db } from "@/db/db";
import { VendorStripePayments } from "./stripe";
import type { Location } from "@subtrees/types";
import { wallets, walletUsages } from "@subtrees/schemas";
import { eq } from "drizzle-orm";

async function checkWalletBalance(location: Location) {
    const wallet = location.wallet;
    if (!wallet) { throw new Error("Wallet not found") }

    try {
        if (wallet.balance < wallet.rechargeThreshold) {
            const stripe = new VendorStripePayments();
            const vendor = await db.query.vendors.findFirst({
                where: (vendor, { eq }) => eq(vendor.id, location.vendorId)
            });
            if (!vendor || !vendor.stripeCustomerId) { throw new Error("Vendor not found") }
            stripe.setCustomer(vendor.stripeCustomerId);
            const { clientSecret } = await stripe.createPaymentIntent(wallet.rechargeAmount, undefined, {
                description: `Auto-charge USD ${wallet.rechargeAmount / 100} was successfully added to wallet.`,
                metadata: {
                    locationId: wallet.locationId
                }
            });
            if (!clientSecret) { throw new Error("Payment failed") }
            const newBalance = wallet.balance += wallet.rechargeAmount;


            await db.update(wallets).set({
                balance: newBalance,
                updated: new Date()
            }).where(eq(wallets.id, wallet.id))

        }

        return location;
    } catch (error) {
        console.error("Error charging wallet:", error);
        throw new Error("Error charging wallet");
    }
}

async function chargeWallet(location: Location, amount: number, description: string) {
    let isCredit = false;
    const wallet = location.wallet;
    if (!wallet) { throw new Error("Wallet not found") }


    if (wallet.credits > amount) {
        wallet.credits -= amount;
        isCredit = true;
    } else {
        wallet.balance -= amount;
    }


    try {

        await db.transaction(async (tx) => {
            await tx.update(wallets).set({
                balance: wallet.balance,
                credits: wallet.credits,
                updated: new Date()
            }).where(eq(wallets.id, wallet.id))

            await tx.insert(walletUsages).values({
                walletId: wallet.id,
                balance: wallet.balance,
                amount: amount,
                isCredit,
                description,
                activityDate: new Date()
            })
        })
        location.wallet = wallet;
        return location;
    } catch (error) {
        console.error("Error charging wallet:", error);
        throw new Error("Error charging wallet");
    }
}

export {
    checkWalletBalance,
    chargeWallet
}