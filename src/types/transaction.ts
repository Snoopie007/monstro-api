import { TransactionStatus, TransactionType } from "./DatabaseEnums";
import { Member, MemberInvoice, MemberPackage, MemberSubscription } from "./member";


type TransactionMetadata = {
    card?: {
        brand: string;
        last4: string;
    };
} & Record<string, unknown>;

export type Transaction = {
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