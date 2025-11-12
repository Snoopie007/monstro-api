import { memberInvoices } from "@/db/schemas";
import type { Member, MemberSubscription } from "./member";
import type { Location } from "./location";

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
}

export type NewInvoice = typeof memberInvoices.$inferInsert;