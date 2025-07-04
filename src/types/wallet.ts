import { wallets, walletUsages } from "@/db/schemas";
import { Location } from "./location";

export type Wallet = typeof wallets.$inferSelect & {
    location?: Location;
}
export type WalletUsage = typeof walletUsages.$inferSelect & {
    wallet?: Wallet;
}