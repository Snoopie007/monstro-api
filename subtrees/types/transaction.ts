import { transactions } from "../schemas";
import type { PaymentType, TransactionStatus, TransactionType } from "./DatabaseEnums";
import type { Member } from "./member";
import type { InvoiceItem, MemberInvoice } from "./invoices";

export type TransactionRefund = {
  id?: string;
  amount: number;
  nonRefundableAmount?: number;
  reason?: string | null;
  note?: string | null;
  source?: string;
  initiatedBy?: string;
  refundedAt?: string;
  // Bundle refunds keep one current attempt here. Pending or unknown attempts
  // must be reconciled before another provider operation can be claimed.
  status?: "pending" | "unknown" | "failed" | "completed";
  attempt?: number;
  requestedAt?: string;
  paymentId?: string;
  gatewayIntegrationId?: string;
  gatewayService?: "cash" | "stripe" | "square" | "authorize";
  operation?: "refund" | "void";
  error?: string;
};

export type TransactionMetadata = {
  refund?: TransactionRefund;
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
  stripeChargeId?: string;
  squarePaymentId?: string;
  squareRefundId?: string;
  authorizeTransactionId?: string;
  authorizeIntegrationId?: string;
  authorizeCustomerProfileId?: string;
  authorizePaymentProfileId?: string;
  authorizeResponseCode?: string;
  authorizeAttemptId?: string;
  authorizeHeld?: boolean;
  authorizeReferenceId?: string;
  authorizeProviderStatus?: string;
  authorizeRefundTransactionIds?: string[];
  authorizeVoidTransactionId?: string;
  authorizeResponseMessage?: string;
  authorizeAvsResultCode?: string;
  authorizeCavvResultCode?: string;
} & Record<string, unknown>;

export type TransactionActivity = {
  reason: string;
  at: string;
  paymentType?: PaymentType;
  brand?: string;
  last4?: string;
};

export type Transaction = typeof transactions.$inferSelect & {
  type: TransactionType;
  paymentType: PaymentType;
  member?: Member;
  status: TransactionStatus;
  metadata?: TransactionMetadata;
  activities?: TransactionActivity[];
  invoice?: MemberInvoice;
};
export type NewTransaction = typeof transactions.$inferInsert;


export type ChargeDetails = {
  total: number;
  subTotal: number;
  unitCost: number;
  tax: number;
  discount: number;
  productDiscount: number;
  /** Monstro's vendor-side platform fee; never part of the member-facing total. */
  feesAmount: number;
  additionalFeeTotal: number;
  additionalFeeLines: InvoiceItem[];
}
