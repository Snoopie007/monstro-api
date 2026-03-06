import { db } from "@/db/db";
import { VendorStripePayments } from "./stripe";
import { wallets, walletUsages } from "@subtrees/schemas";
import { eq, sql } from "drizzle-orm";

type ReserveAIBudgetProps = {
    lid: string;
    operationId: string;
    amount: number;
    description?: string;
};

type SettleAIBudgetProps = {
    lid: string;
    operationId: string;
    reservedAmount: number;
    actualAmount: number;
    description?: string;
};

type RefundAIBudgetProps = {
    lid: string;
    operationId: string;
    reservedAmount: number;
    reason?: string;
};

type WalletMutationResult = {
    ok: boolean;
    reason?: string;
    available?: number;
    charged?: number;
    refunded?: number;
    shortfall?: number;
};

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

async function reserveAIBudgetAtomic({ lid, operationId, amount, description }: ReserveAIBudgetProps): Promise<WalletMutationResult> {
    const reserveAmount = Math.max(0, Math.floor(amount));
    if (!reserveAmount) {
        return { ok: true, charged: 0 };
    }

    try {
        return await db.transaction(async (tx) => {
            const rows = await tx.execute(sql`
                SELECT id, balance, credits
                FROM wallets
                WHERE location_id = ${lid}
                LIMIT 1
                FOR UPDATE
            `) as unknown as Array<{ id: string; balance: number; credits: number }>;

            const wallet = rows[0];
            if (!wallet) {
                return { ok: false, reason: "WALLET_NOT_FOUND" };
            }

            const reserveLabel = `AI_RESERVE op:${operationId}`;
            const existingReserve = await tx.execute(sql`
                SELECT id, amount
                FROM wallet_usages
                WHERE wallet_id = ${wallet.id}
                  AND description LIKE ${`${reserveLabel}%`}
                LIMIT 1
            `) as unknown as Array<{ id: string; amount: number }>;

            if (existingReserve[0]) {
                return { ok: true, charged: Number(existingReserve[0].amount || reserveAmount) };
            }

            const startingBalance = Number(wallet.balance || 0);
            const startingCredits = Number(wallet.credits || 0);
            const available = startingBalance + startingCredits;

            if (available < reserveAmount) {
                return { ok: false, reason: "INSUFFICIENT_FUNDS", available };
            }

            const creditsUsed = Math.min(startingCredits, reserveAmount);
            const chargeFromBalance = reserveAmount - creditsUsed;
            const newCredits = startingCredits - creditsUsed;
            const newBalance = startingBalance - chargeFromBalance;

            await tx.update(wallets).set({
                balance: newBalance,
                credits: newCredits,
                updated: new Date(),
            }).where(eq(wallets.id, wallet.id));

            await tx.insert(walletUsages).values({
                walletId: wallet.id,
                balance: newBalance,
                amount: reserveAmount,
                isCredit: chargeFromBalance === 0,
                description: reserveLabel + (description ? ` ${description}` : ""),
                activityDate: new Date(),
            });

            return { ok: true, charged: reserveAmount };
        });
    } catch {
        return { ok: false, reason: "RESERVE_FAILED" };
    }
}

async function settleAIBudgetAtomic({ lid, operationId, reservedAmount, actualAmount, description }: SettleAIBudgetProps): Promise<WalletMutationResult> {
    const reserve = Math.max(0, Math.floor(reservedAmount));
    const actual = Math.max(0, Math.floor(actualAmount));

    try {
        return await db.transaction(async (tx) => {
            const rows = await tx.execute(sql`
                SELECT id, balance, credits
                FROM wallets
                WHERE location_id = ${lid}
                LIMIT 1
                FOR UPDATE
            `) as unknown as Array<{ id: string; balance: number; credits: number }>;

            const wallet = rows[0];
            if (!wallet) {
                return { ok: false, reason: "WALLET_NOT_FOUND" };
            }

            const settleLabel = `AI_SETTLE op:${operationId}`;
            const existingSettle = await tx.execute(sql`
                SELECT id
                FROM wallet_usages
                WHERE wallet_id = ${wallet.id}
                  AND description LIKE ${`${settleLabel}%`}
                LIMIT 1
            `) as unknown as Array<{ id: string }>;

            if (existingSettle[0]) {
                return { ok: true, charged: actual };
            }

            const reserveLabel = `AI_RESERVE op:${operationId}`;
            const reserveExists = await tx.execute(sql`
                SELECT id
                FROM wallet_usages
                WHERE wallet_id = ${wallet.id}
                  AND description LIKE ${`${reserveLabel}%`}
                LIMIT 1
            `) as unknown as Array<{ id: string }>;

            if (!reserveExists[0]) {
                return { ok: false, reason: "RESERVE_NOT_FOUND" };
            }

            let balance = Number(wallet.balance || 0);
            let credits = Number(wallet.credits || 0);
            let refunded = 0;
            let charged = reserve;
            let shortfall = 0;

            if (actual < reserve) {
                refunded = reserve - actual;
                balance += refunded;
                charged = actual;
            } else if (actual > reserve) {
                const extra = actual - reserve;
                const available = balance + credits;
                if (available >= extra) {
                    const creditsUsed = Math.min(credits, extra);
                    const fromBalance = extra - creditsUsed;
                    credits -= creditsUsed;
                    balance -= fromBalance;
                    charged = actual;

                    await tx.insert(walletUsages).values({
                        walletId: wallet.id,
                        balance,
                        amount: extra,
                        isCredit: fromBalance === 0,
                        description: `AI_TOPUP op:${operationId}`,
                        activityDate: new Date(),
                    });
                } else {
                    shortfall = extra - available;
                    charged = reserve + available;
                    balance = 0;
                    credits = 0;

                    if (available > 0) {
                        await tx.insert(walletUsages).values({
                            walletId: wallet.id,
                            balance,
                            amount: available,
                            isCredit: false,
                            description: `AI_PARTIAL_TOPUP op:${operationId}`,
                            activityDate: new Date(),
                        });
                    }
                }
            }

            await tx.update(wallets).set({
                balance,
                credits,
                updated: new Date(),
            }).where(eq(wallets.id, wallet.id));

            if (refunded > 0) {
                await tx.insert(walletUsages).values({
                    walletId: wallet.id,
                    balance,
                    amount: refunded,
                    isCredit: true,
                    description: `AI_REFUND op:${operationId}`,
                    activityDate: new Date(),
                });
            }

            await tx.insert(walletUsages).values({
                walletId: wallet.id,
                balance,
                amount: charged,
                isCredit: false,
                description: settleLabel + (description ? ` ${description}` : "") + (shortfall > 0 ? ` shortfall:${shortfall}` : ""),
                activityDate: new Date(),
            });

            return { ok: shortfall === 0, charged, refunded, shortfall };
        });
    } catch {
        return { ok: false, reason: "SETTLE_FAILED" };
    }
}

async function refundAIBudgetAtomic({ lid, operationId, reservedAmount, reason }: RefundAIBudgetProps): Promise<WalletMutationResult> {
    const reserve = Math.max(0, Math.floor(reservedAmount));
    if (!reserve) {
        return { ok: true, refunded: 0 };
    }

    try {
        return await db.transaction(async (tx) => {
            const rows = await tx.execute(sql`
                SELECT id, balance
                FROM wallets
                WHERE location_id = ${lid}
                LIMIT 1
                FOR UPDATE
            `) as unknown as Array<{ id: string; balance: number }>;

            const wallet = rows[0];
            if (!wallet) {
                return { ok: false, reason: "WALLET_NOT_FOUND" };
            }

            const settleLabel = `AI_SETTLE op:${operationId}`;
            const existingSettle = await tx.execute(sql`
                SELECT id
                FROM wallet_usages
                WHERE wallet_id = ${wallet.id}
                  AND description LIKE ${`${settleLabel}%`}
                LIMIT 1
            `) as unknown as Array<{ id: string }>;
            if (existingSettle[0]) {
                return { ok: true, refunded: 0 };
            }

            const refundLabel = `AI_RESERVE_REFUND op:${operationId}`;
            const existingRefund = await tx.execute(sql`
                SELECT id
                FROM wallet_usages
                WHERE wallet_id = ${wallet.id}
                  AND description LIKE ${`${refundLabel}%`}
                LIMIT 1
            `) as unknown as Array<{ id: string }>;
            if (existingRefund[0]) {
                return { ok: true, refunded: reserve };
            }

            const reserveLabel = `AI_RESERVE op:${operationId}`;
            const reserveExists = await tx.execute(sql`
                SELECT id
                FROM wallet_usages
                WHERE wallet_id = ${wallet.id}
                  AND description LIKE ${`${reserveLabel}%`}
                LIMIT 1
            `) as unknown as Array<{ id: string }>;
            if (!reserveExists[0]) {
                return { ok: true, refunded: 0 };
            }

            const newBalance = Number(wallet.balance || 0) + reserve;
            await tx.update(wallets).set({
                balance: newBalance,
                updated: new Date(),
            }).where(eq(wallets.id, wallet.id));

            await tx.insert(walletUsages).values({
                walletId: wallet.id,
                balance: newBalance,
                amount: reserve,
                isCredit: true,
                description: refundLabel + (reason ? ` ${reason}` : ""),
                activityDate: new Date(),
            });

            return { ok: true, refunded: reserve };
        });
    } catch {
        return { ok: false, reason: "REFUND_FAILED" };
    }
}

export {
    hasEnoughBalance,
    chargeWallet,
    reserveAIBudgetAtomic,
    settleAIBudgetAtomic,
    refundAIBudgetAtomic,
}
