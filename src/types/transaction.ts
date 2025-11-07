import { transactions } from "@/db/schemas";
import { PaymentType, TransactionStatus, TransactionType } from "./DatabaseEnums";
import { Member, MemberInvoice, MemberPackage, MemberSubscription } from "./member";

export type TransactionMetadata = {
  card?: {
    brand: string;
    last4: string;
  }
  us_bank_account?: {
    bank_name: string;
    last4: string;
  }
} & Record<string, unknown>;

export type Transaction = typeof transactions.$inferSelect & {
  type: TransactionType;
  paymentType: PaymentType;
  member?: Member;
  status: TransactionStatus;
  subscription?: MemberSubscription;
  package?: MemberPackage;
  metadata?: TransactionMetadata;
  invoice?: MemberInvoice;
  items?: TransactionItem[];
};

export type TransactionItem = {
  name: string;
  quantity: number;
  price: number;
  productId?: string;
}

export type NewTransaction = typeof transactions.$inferInsert;