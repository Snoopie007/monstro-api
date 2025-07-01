import {TransactionStatus, TransactionType} from "./DatabaseEnums";
import {
  Member,
  MemberInvoice,
  MemberPackage,
  MemberSubscription,
} from "./member";

type TransactionMetadata = {
  card?: {
    brand: string;
    last4: string;
  };
} & Record<string, unknown>;

export type Transaction = {
  id?: number;
  description: string | null;
  type: TransactionType;
  paymentMethod: string;
  amount: number;
  locationId: number;
  memberId?: number | null;
  member?: Member;
  status: TransactionStatus;
  items: Record<string, unknown>[];
  taxAmount: number;
  subscriptionId?: number | null;
  subscription?: MemberSubscription;
  packageId?: number | null;
  package?: MemberPackage;
  chargeDate: Date;
  currency: string;
  metadata?: TransactionMetadata;
  refunded?: boolean;
  invoiceId?: number | null;
  invoice?: MemberInvoice;
  created?: Date;
  updated?: Date | null;
};
