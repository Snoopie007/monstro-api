
export type Wallet = {
    id: number,
    locationId: number,
    balance: number,
    credits: number,
    rechargeAmount: number,
    rechargeThreshold: number,
    lastCharged: Date | null,
    usages?: WalletUsage[],
    created: Date,
    updated: Date | null,
}
export type WalletUsage = {
    id: number,
    walletId: number,
    amount: number,
    isCredit: boolean,
    description: string,
    balance: number
    activityDate: Date | null,
    created: Date,
}