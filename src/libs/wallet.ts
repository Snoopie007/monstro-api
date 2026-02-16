import { db } from "@/db/db";
import { VendorStripePayments } from "./stripe";
import { wallets, walletUsages } from "@subtrees/schemas";
import { eq, sql } from "drizzle-orm";

type RechargeWalletProps = {
    lid: string;
    vendorId: string;
    rechargeAmount: number;
};


async function rechargeWallet({ lid, vendorId, rechargeAmount }: RechargeWalletProps): Promise<boolean> {
    try {
        const stripe = new VendorStripePayments();
        const vendor = await db.query.vendors.findFirst({
            where: (vendor, { eq }) => eq(vendor.id, vendorId),
            columns: {
                stripeCustomerId: true,
            }
        });

        if (!vendor || !vendor.stripeCustomerId) {
            return false;
        }

        stripe.setCustomer(vendor.stripeCustomerId);

        await stripe.createPaymentIntent(rechargeAmount, undefined, {
            description: `Auto-charge USD ${(rechargeAmount / 100).toFixed(2)} was successfully added to wallet.`,
            metadata: {
                locationId: lid
            }
        });

        // Optionally: Save the payment intent or trigger further DB updates here if needed

        return true;
    } catch {
        return false;
    }
}




async function hasEnoughBalance({ lid, amount }: { lid: string, amount: number }): Promise<boolean> {
    try {
        const res = await db.execute(sql`
            SELECT (balance > ${amount}) AS ok
            FROM wallets
            WHERE location_id = ${lid}
            LIMIT 1
        `);
        const row = (res as unknown as { ok: boolean }[])[0];
        return row?.ok === true;
    } catch {
        return false;
    }
}

type ChargeWalletProps = {
    lid: string;
    vendorId: string;
    amount: number;
    description: string;
}



async function chargeWallet({ lid, vendorId, amount, description }: ChargeWalletProps): Promise<boolean> {
    let isCredit = false;

    try {
        const wallet = await db.query.wallets.findFirst({
            where: (wallets, { eq }) => eq(wallets.locationId, lid),
            columns: {
                id: true,
                balance: true,
                credits: true,
                rechargeAmount: true,
                rechargeThreshold: true,
            }
        });
        if (!wallet) {
            return false;

        }

        const { balance, credits, rechargeAmount, rechargeThreshold } = wallet;

        // Use credits first, charge the rest to balance if needed
        let chargeAmount: number;
        let creditAfterCharge: number;

        if (credits >= amount) {
            chargeAmount = 0;
            creditAfterCharge = credits - amount;
            isCredit = true;
        } else {
            chargeAmount = amount - credits;
            creditAfterCharge = 0;
        }

        // When charging balance, optionally trigger recharge and check we have enough
        let newBalance = balance;
        if (chargeAmount > 0) {
            if (balance < rechargeThreshold) {
                await rechargeWallet({ lid, vendorId, rechargeAmount });
                newBalance = balance + rechargeAmount;
            }
            if (newBalance < chargeAmount) {
                return false;
            }
            newBalance = newBalance - chargeAmount;
        }

        await db.transaction(async (tx) => {
            await tx.update(wallets).set({
                balance: newBalance,
                credits: creditAfterCharge,
                updated: new Date()
            }).where(eq(wallets.id, wallet.id))

            await tx.insert(walletUsages).values({
                walletId: wallet.id,
                balance: newBalance,
                amount: amount,
                isCredit,
                description,
                activityDate: new Date()
            })
        })
        return true;
    } catch {
        return false;
    }
}

export {
    hasEnoughBalance,
    chargeWallet
}