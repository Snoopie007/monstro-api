import { db } from "@/db/db";
import { VendorStripePayments } from "./stripe";
import { wallets, walletLedgers } from "@subtrees/schemas";
import { eq } from "drizzle-orm";

export const RESERVATION_OFFSET = 0.1;

function applyReservationOffset(amount: number) {
    const base = Math.max(0, Math.floor(amount));
    if (!base) return 0;
    return Math.ceil(base * (1 + RESERVATION_OFFSET));
}

function needsRecharge(balance: number, threshold: number) {
    return balance < 0 || balance < threshold;
}

type WalletMutationResult = {
    ok: boolean;
    reason?: string;
};

type LockedWallet = {
    id: string;
    balance: number;
    rechargeAmount: number;
    rechargeThreshold: number;
};

type ReserveAtomicProps = {
    amount: number;
    description: string;
    id?: string;
};

type SettleAtomicProps = {
    ledgerId: string;
    actualAmount: number;
};

type VoidAtomicProps = {
    ledgerId: string;
};

type ChargeProps = {
    vendorId: string;
    amount: number;
    description: string;
};

async function findStripeCustomer(lid: string, vendorId?: string): Promise<string | null> {
    let resolvedVendorId = vendorId;
    if (!resolvedVendorId) {
        const location = await db.query.locations.findFirst({
            where: (row, { eq }) => eq(row.id, lid),
            columns: { vendorId: true },
        });
        resolvedVendorId = location?.vendorId;
    }
    if (!resolvedVendorId) return null;

    const vendor = await db.query.vendors.findFirst({
        where: (row, { eq }) => eq(row.id, resolvedVendorId!),
        columns: { stripeCustomerId: true },
    });
    return vendor?.stripeCustomerId || null;
}

export class Wallet {
    constructor(private readonly lid: string) { }

    async charge({ vendorId, amount, description }: ChargeProps): Promise<boolean> {
        const chargeAmount = Math.max(0, Math.floor(amount));
        if (!chargeAmount) return true;

        try {
            const current = await db.query.wallets.findFirst({
                where: (row, { eq }) => eq(row.locationId, this.lid),
                columns: {
                    id: true,
                    balance: true,
                    rechargeAmount: true,
                    rechargeThreshold: true,
                },
            });
            if (!current) return false;

            if (needsRecharge(current.balance, current.rechargeThreshold)) {
                const recharged = await this.recharge(current.rechargeAmount, vendorId);
                if (!recharged) return false;
            }

            return await db.transaction(async (tx) => {
                const wallet = await this.lock(tx);
                if (!wallet) return false;
                if (wallet.balance < chargeAmount) return false;

                const newBalance = wallet.balance - chargeAmount;
                await tx.update(wallets).set({
                    balance: newBalance,
                    updated: new Date(),
                }).where(eq(wallets.id, wallet.id));

                await tx.insert(walletLedgers).values({
                    walletId: wallet.id,
                    type: "usage",
                    description,
                    amount: chargeAmount,
                    balance: newBalance,
                    activityDate: new Date(),
                });

                return true;
            });
        } catch {
            return false;
        }
    }

    async reserveAtomic({ amount, description, id }: ReserveAtomicProps): Promise<WalletMutationResult> {
        const reserveAmount = applyReservationOffset(amount);
        if (!reserveAmount) {
            return { ok: true };
        }

        try {
            if (id) {
                const existing = await db.query.walletLedgers.findFirst({
                    where: (row, { eq }) => eq(row.id, id),
                    columns: { id: true },
                });
                if (existing) {
                    return { ok: true };
                }
            }

            const current = await db.query.wallets.findFirst({
                where: (row, { eq }) => eq(row.locationId, this.lid),
                columns: {
                    id: true,
                    balance: true,
                    rechargeAmount: true,
                    rechargeThreshold: true,
                },
            });
            if (!current) {
                return { ok: false, reason: "WALLET_NOT_FOUND" };
            }

            if (reserveAmount >= current.rechargeThreshold) {
                return { ok: false, reason: "RESERVE_EXCEEDS_THRESHOLD" };
            }

            if (needsRecharge(current.balance, current.rechargeThreshold)) {
                const recharged = await this.recharge(current.rechargeAmount);
                if (!recharged) {
                    return { ok: false, reason: "RECHARGE_FAILED" };
                }
            }

            return await db.transaction(async (tx) => {
                const wallet = await this.lock(tx);
                if (!wallet) {
                    return { ok: false, reason: "WALLET_NOT_FOUND" };
                }

                if (id) {
                    const existing = await tx.query.walletLedgers.findFirst({
                        where: (row, { eq }) => eq(row.id, id),
                        columns: { id: true },
                    });
                    if (existing) {
                        return { ok: true };
                    }
                }

                if (reserveAmount >= wallet.rechargeThreshold) {
                    return { ok: false, reason: "RESERVE_EXCEEDS_THRESHOLD" };
                }

                const newBalance = wallet.balance - reserveAmount;
                const now = new Date();
                await tx.update(wallets).set({
                    balance: newBalance,
                    updated: now,
                }).where(eq(wallets.id, wallet.id));

                await tx.insert(walletLedgers).values({
                    ...(id ? { id } : {}),
                    walletId: wallet.id,
                    type: "reserved",
                    description,
                    amount: reserveAmount,
                    balance: newBalance,
                    activityDate: now,
                });

                return { ok: true };
            });
        } catch {
            return { ok: false, reason: "RESERVE_FAILED" };
        }
    }

    async settleAtomic({ ledgerId, actualAmount }: SettleAtomicProps): Promise<WalletMutationResult> {
        const actual = Math.max(0, Math.floor(actualAmount));

        try {
            return await db.transaction(async (tx) => {
                const wallet = await this.lock(tx);
                if (!wallet) {
                    return { ok: false, reason: "WALLET_NOT_FOUND" };
                }

                const ledger = await tx.query.walletLedgers.findFirst({
                    where: (row, { eq }) => eq(row.id, ledgerId),
                });
                if (!ledger) {
                    return { ok: false, reason: "RESERVE_NOT_FOUND" };
                }
                if (ledger.type === "usage") {
                    return { ok: true };
                }
                if (ledger.type !== "reserved") {
                    return { ok: false, reason: "RESERVE_NOT_FOUND" };
                }

                const reserved = Number(ledger.amount || 0);
                let balance = wallet.balance;
                let charged = reserved;

                if (actual < reserved) {
                    charged = actual;
                    balance += reserved - actual;
                } else if (actual > reserved) {
                    charged = actual;
                    balance -= actual - reserved;
                }

                await tx.update(wallets).set({
                    balance,
                    updated: new Date(),
                }).where(eq(wallets.id, wallet.id));

                await tx.update(walletLedgers).set({
                    type: "usage",
                    amount: charged,
                    balance,
                }).where(eq(walletLedgers.id, ledger.id));

                return { ok: true };
            });
        } catch {
            return { ok: false, reason: "SETTLE_FAILED" };
        }
    }

    async voidAtomic({ ledgerId }: VoidAtomicProps): Promise<WalletMutationResult> {
        if (!ledgerId) {
            return { ok: true };
        }

        try {
            return await db.transaction(async (tx) => {
                const wallet = await this.lock(tx);
                if (!wallet) {
                    return { ok: false, reason: "WALLET_NOT_FOUND" };
                }

                const ledger = await tx.query.walletLedgers.findFirst({
                    where: (row, { eq }) => eq(row.id, ledgerId),
                });
                if (!ledger) {
                    return { ok: true };
                }
                if (ledger.type !== "reserved") {
                    return { ok: true };
                }

                const reserved = Number(ledger.amount || 0);
                const newBalance = wallet.balance + reserved;
                await tx.update(wallets).set({
                    balance: newBalance,
                    updated: new Date(),
                }).where(eq(wallets.id, wallet.id));

                await tx.delete(walletLedgers).where(eq(walletLedgers.id, ledger.id));

                return { ok: true, refunded: reserved, id: ledger.id };
            });
        } catch {
            return { ok: false, reason: "VOID_FAILED" };
        }
    }

    private async recharge(rechargeAmount: number, vendorId?: string): Promise<boolean> {
        const amount = Math.max(0, Math.floor(rechargeAmount));
        if (!amount) return false;

        try {
            const stripeCustomerId = await findStripeCustomer(this.lid, vendorId);
            if (!stripeCustomerId) return false;

            const stripe = new VendorStripePayments();
            stripe.setCustomer(stripeCustomerId);
            await stripe.createPaymentIntent(amount, undefined, {
                description: `Auto-charge USD ${(amount / 100).toFixed(2)} was successfully added to wallet.`,
                metadata: {
                    locationId: this.lid,
                },
            });

            return await db.transaction(async (tx) => {
                const wallet = await this.lock(tx);
                if (!wallet) return false;

                const newBalance = wallet.balance + amount;
                const now = new Date();
                await tx.update(wallets).set({
                    balance: newBalance,
                    lastCharged: now,
                    updated: now,
                }).where(eq(wallets.id, wallet.id));

                await tx.insert(walletLedgers).values({
                    walletId: wallet.id,
                    type: "credit",
                    description: `Auto-charge USD ${(amount / 100).toFixed(2)} was successfully added to wallet.`,
                    amount,
                    balance: newBalance,
                    activityDate: now,
                });

                return true;
            });
        } catch {
            return false;
        }
    }

    private async lock(tx: Parameters<Parameters<typeof db.transaction>[0]>[0]): Promise<LockedWallet | null> {
        const [row] = await tx
            .select({
                id: wallets.id,
                balance: wallets.balance,
                rechargeAmount: wallets.rechargeAmount,
                rechargeThreshold: wallets.rechargeThreshold,
            })
            .from(wallets)
            .where(eq(wallets.locationId, this.lid))
            .limit(1)
            .for("update");

        if (!row) return null;
        return {
            id: row.id,
            balance: Number(row.balance || 0),
            rechargeAmount: Number(row.rechargeAmount || 0),
            rechargeThreshold: Number(row.rechargeThreshold || 0),
        };
    }
}

