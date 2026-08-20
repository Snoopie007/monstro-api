import { memberInvoices } from "../schemas/invoice";
import type { Location } from "./location";
import type { Member, MemberSubscription } from "./member";

export type MemberInvoice = typeof memberInvoices.$inferSelect & {
    member?: Member;
    location?: Location;
    items?: InvoiceItem[];
    memberSubscription?: MemberSubscription;
}

type InvoiceItemBase = {
    name: string;
    quantity: number;
    price: number;
    productId?: string;
    discount?: number;
    tax?: number;
}

export type InvoiceItem =
    | (InvoiceItemBase & {
        kind?: "item";
        sourceFeeId?: never;
    })
    | (InvoiceItemBase & {
        kind: "additional_fee";
        sourceFeeId: string;
    });

export type NewInvoice = typeof memberInvoices.$inferInsert;
