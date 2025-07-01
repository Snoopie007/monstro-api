<<<<<<< HEAD
import { TransactionStatus, TransactionType } from "./DatabaseEnums";
import { Member, MemberInvoice, MemberPackage, MemberSubscription } from "./member";

=======
import {TransactionStatus, TransactionType} from "./DatabaseEnums";
import {
  Member,
  MemberInvoice,
  MemberPackage,
  MemberSubscription,
} from "./member";
>>>>>>> 22125ebf9f92d05da0f1397f845bbaa8d79a1fe6

type TransactionMetadata = {
  card?: {
    brand: string;
    last4: string;
  };
} & Record<string, unknown>;

export type Transaction = {
<<<<<<< HEAD
    id?: string;
    description: string | null;
    type: TransactionType;
    paymentMethod: string;
    amount: number;
    locationId: string;
    memberId?: string | null;
    member?: Member;
    status: TransactionStatus;
    item: string | null;
    tax: number;
    subscriptionId?: string | null;
    subscription?: MemberSubscription;
    packageId?: string | null;
    package?: MemberPackage;
    chargeDate: Date;
    currency: string;
    metadata?: TransactionMetadata;
    refunded?: boolean;
    invoiceId?: string | null;
    invoice?: MemberInvoice;
    created?: Date;
    updated?: Date | null;
};
=======
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
>>>>>>> 22125ebf9f92d05da0f1397f845bbaa8d79a1fe6
