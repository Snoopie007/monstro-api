
import { getStripe } from "@/libs/server-utils";
import InvoiceOptions from "./invoice-options";
import { auth } from "@/auth";
import { formatAmountForDisplay, formatDateTime } from "@/libs/utils";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui";
import { TableHeader } from "react-stately";
import Stripe from "stripe";


async function getCustomerInvoices(customerId: string): Promise<Stripe.Charge[]> {
    try {
        const stripe = getStripe();
        const invoices = await stripe.charges.list({
            customer: customerId,
            limit: 10
        });
        return invoices.data;
    } catch (error) {
        console.log(error);
        return [];
    }
}


export default async function InvoicesPage({ params }: { params: { id: string } }) {
    const session = await auth();

    const invoices = await getCustomerInvoices(session?.user.stripeCustomerId);

    return (
        <div>
            <div className="mb-4">
                <div className='text-xl font-semibold mb-1'>Invoices</div>
                <p className='text-sm'>Manage, download your invoices below.</p>

            </div>
            <div className="border rounded-sm">
                <Table >
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices?.map((invoice, index) => (
                            <TableRow key={index} >
                                <TableCell className="py-3">{formatDateTime(invoice.created * 1000)}</TableCell>

                                <TableCell className="py-3">{formatAmountForDisplay(invoice.amount / 100, 'usd', true, 2)}</TableCell>
                                <TableCell className="py-3">{invoice.captured ? (
                                    <span className="text-green-500">Paid</span>
                                ) : (
                                    <span className="text-red-500">Unpaid</span>
                                )}</TableCell>
                                <TableCell className="text-right py-3"><InvoiceOptions invoiceUrl={invoice.receipt_url || ""} /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

            </div>
        </div>
    )
}
