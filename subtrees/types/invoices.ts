import { memberInvoices } from "../schemas/invoice";
import type { Location } from "./location";
import type { Member, MemberSubscription } from "./member";
import type { InvoiceItem } from "../utils/invoiceItems";

export type MemberInvoice = typeof memberInvoices.$inferSelect & {
    member?: Member;
    location?: Location;
    items?: InvoiceItem[];
    memberSubscription?: MemberSubscription;
}

export type { InvoiceItem } from "../utils/invoiceItems";

export type NewInvoice = typeof memberInvoices.$inferInsert;
