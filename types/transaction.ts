import { transactions } from "../schemas";
import type { PaymentType, TransactionStatus, TransactionType } from "./DatabaseEnums";
import type { Member, MemberInvoice } from "./member";

export type TransactionMetadata = {
  card?: {
    brand: string;
    last4: string;
  }
  us_bank_account?: {
    bank_name: string;
    last4: string;
  }
  subscriptionId?: string;
  packageId?: string;
  chargeId?: string;
} & Record<string, unknown>;


export type TransactionFees = {
  stripeFee: number;
  monstroFee: number;
}
export type Transaction = typeof transactions.$inferSelect & {
  type: TransactionType;
  paymentType: PaymentType;
  member?: Member;
  status: TransactionStatus;
  metadata?: TransactionMetadata;
  invoice?: MemberInvoice;
};

export type TransactionItem = {
  name: string;
  quantity: number;
  price: number;
  productId?: string;
  discount?: number;
}

export type NewTransaction = typeof transactions.$inferInsert;