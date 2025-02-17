


export type VendorWallet = {
    id: number,
    locationId: number,
    balance: number,
    credits: number,
    rechargeAmount: number,
    rechargeThreshold: number,
    lastRecharge: Date,
}

export const wallet: VendorWallet = {
    id: 1,
    balance: 100,
    credits: 100,
    rechargeAmount: 25,
    locationId: 1,
    rechargeThreshold: 10,
    lastRecharge: new Date(),
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
