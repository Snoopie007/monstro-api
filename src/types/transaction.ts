import { TransactionStatus } from "./enums";
import { Member, MemberInvoice, MemberPackage, MemberSubscription } from "./member";


export type Transaction = {
    id?: number;
    description: string | null;
    transactionType: string;
    paymentMethod: string;
    paymentType: string;
    amount: number;
    locationId: number;
    memberId?: number | null;
    member?: Member;
    status: TransactionStatus;
    item: string;
    subscriptionId?: number | null;
    subscription?: MemberSubscription;
    packageId?: string | null;
    package?: MemberPackage;
    chargeDate: Date;
    currency: string;
    metadata?: Record<string, any>;
    refunded?: boolean;
    invoiceId?: string | null;
    invoice?: MemberInvoice;
    created?: Date;
    updated?: Date | null;
    deleted?: Date | null;
};