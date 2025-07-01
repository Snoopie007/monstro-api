import { transactions } from "@/db/schemas";
import { TransactionStatus, TransactionType } from "./DatabaseEnums";
import { Member, MemberInvoice, MemberPackage, MemberSubscription } from "./member";

type TransactionMetadata = {
  card?: {
    brand: string;
    last4: string;
  };
} & Record<string, unknown>;

export type Transaction = typeof transactions.$inferSelect & {
  type: TransactionType;
  member?: Member;
  status: TransactionStatus;
  subscription?: MemberSubscription;
  package?: MemberPackage;
  metadata?: TransactionMetadata;
  invoice?: MemberInvoice;
};
