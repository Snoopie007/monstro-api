
export type Wallet = {
    id: number,
    locationId: number,
    balance: number,
    credits: number,
    rechargeAmount: number,
    rechargeThreshold: number,
    lastRecharge: Date,
    usages?: WalletUsage[],
    created: Date,
    updated: Date | null,
    deleted: Date | null,
}
export type WalletUsage = {
    id: number,
    walletId: number,
    amount: number,
    eventId: number,
    category: string,
    description: string,
    balance: number
    activityDate: Date | null,
    created: Date,
}