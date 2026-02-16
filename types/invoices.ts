import { memberInvoices } from "../schemas/invoice";
import type { Location } from "./location";
import type { Member, MemberSubscription } from "./member";

export type Invoice = typeof memberInvoices.$inferSelect & {
    member?: Member;
    location?: Location;
    items?: InvoiceItem[];
    memberSubscription?: MemberSubscription;
}

export type InvoiceItem = {
    name: string;
    quantity: number;
    price: number;
    productId?: string;
    discount?: number;
    tax?: number;
}

export type NewInvoice = typeof memberInvoices.$inferInsert;
