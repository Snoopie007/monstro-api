import { wallets, walletLedgers } from "../schemas/wallets";
import type { Location } from "./location";

export type WalletLedgerType = "credit" | "reserved" | "usage";

export type Wallet = typeof wallets.$inferSelect & {
    location?: Location;
}
export type WalletLedger = typeof walletLedgers.$inferSelect & {
    wallet?: Wallet;
}
