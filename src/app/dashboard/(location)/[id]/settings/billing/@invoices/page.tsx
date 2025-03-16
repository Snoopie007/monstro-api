
import { VendorStripePayments } from "@/libs/server/stripe";
import { auth } from "@/auth";
import { formatAmountForDisplay } from "@/libs/utils";
import { Badge, Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui";
import { TableHeader } from "react-stately";
import Stripe from "stripe";
import InvoiceOptions from "./InvoiceOptions";
import { format } from "date-fns";


async function getCustomerInvoices(customerId: string): Promise<Stripe.Invoice[]> {
    try {
        const stripe = new VendorStripePayments();
        const invoices = await stripe.getInvoices(customerId);
        console.log(invoices)
        return invoices

    } catch (error) {
        console.log(error);
        return [];
    }
}


export default async function InvoicesPage(props: { params: Promise<{ id: number }> }) {
    const session = await auth();

    const invoices = await getCustomerInvoices(session?.user.stripeCustomerId);

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <div className='text-xl font-semibold mb-1'>Invoices</div>
                <p className='text-sm'>Manage, download your invoices below.</p>

            </div>
            <div className="border rounded-sm">
                <Table >
                    <TableHeader>
                        <TableRow>
                            {['ID', 'Date', 'Status', 'Amount', ''].map((header, i) => (
                                <TableHead key={i}>{header}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="py-3  text-center">No invoices found</TableCell>
                            </TableRow>
                        )}
                        {invoices?.map((invoice, index) => (
                            <TableRow key={index} >
                                <TableCell className="py-3">{format(invoice.created * 1000, 'MMM d, yyyy')}</TableCell>

                                <TableCell className="py-3">{formatAmountForDisplay(invoice.total / 100, 'usd', true)}</TableCell>
                                <TableCell className="py-3">
                                    <Badge>{invoice.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right py-3"><InvoiceOptions invoiceUrl={invoice.invoice_pdf || ""} /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

            </div>
        </div>
    )
}
