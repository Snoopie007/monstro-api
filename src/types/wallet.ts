import { wallets, walletUsages } from "@/db/schemas";

export type Wallet = typeof wallets.$inferSelect & {
    location: Location;
}
export type WalletUsage = typeof walletUsages.$inferSelect & {
    wallet: Wallet;
}