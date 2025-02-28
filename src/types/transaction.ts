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
    status: 'paid' | 'incomplete' | 'failed';
    item: string;
    subscriptionId?: number | null;
    subscription?: MemberSubscription;
    packageId?: string | null;
    package?: MemberPackage;
    chargeDate: Date;
    currency: string;
    metadata?: Record<string, any>;
    refunded?: boolean;
    invoiceId?: number;
    invoice?: MemberInvoice;
    created?: Date;
    updated?: Date | null;
    deleted?: Date | null;
};