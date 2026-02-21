import { transactions } from "../schemas";
import type { PaymentType, TransactionStatus, TransactionType } from "./DatabaseEnums";
import type { Member } from "./member";
import type { MemberInvoice } from "./invoices";

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


export type Transaction = typeof transactions.$inferSelect & {
  type: TransactionType;
  paymentType: PaymentType;
  member?: Member;
  status: TransactionStatus;
  metadata?: TransactionMetadata;
  invoice?: MemberInvoice;
};
export type NewTransaction = typeof transactions.$inferInsert;


export type ChargeDetails = {
  total: number;
  subTotal: number;
  unitCost: number;
  tax: number;
  monstroFee: number;
  stripeFee: number;
  applicationFeeAmount: number;
}
