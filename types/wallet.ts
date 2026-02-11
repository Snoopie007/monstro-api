import { wallets, walletUsages } from "../schemas";
import type { Location } from "./location";
export type Wallet = typeof wallets.$inferSelect & {
    location: Location;
}
export type WalletUsage = typeof walletUsages.$inferSelect & {
    wallet: Wallet;
}