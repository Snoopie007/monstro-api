
import { StripePayments } from "@/libs/server/stripe";
import { auth } from "@/auth";
import { formatAmountForDisplay, formatDateTime } from "@/libs/utils";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui";
import { TableHeader } from "react-stately";
import Stripe from "stripe";
import InvoiceOptions from "./InvoiceOptions";


async function getCustomerInvoices(customerId: string): Promise<Stripe.Charge[]> {
    try {
        const stripe = new StripePayments();
        return await stripe.getInvoices(customerId);
    } catch (error) {
        console.log(error);
        return [];
    }
}


export default async function InvoicesPage(props: { params: Promise<{ id: number }> }) {
    const session = await auth();

    const charges = await getCustomerInvoices(session?.user.stripeCustomerId);

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
                        {charges?.map((charge, index) => (
                            <TableRow key={index} >
                                <TableCell className="py-3">{formatDateTime(charge.created * 1000)}</TableCell>

                                <TableCell className="py-3">{formatAmountForDisplay(charge.amount / 100, 'usd', true)}</TableCell>
                                <TableCell className="py-3">{charge.captured ? (
                                    <span className="text-green-500">Paid</span>
                                ) : (
                                    <span className="text-red-500">Unpaid</span>
                                )}</TableCell>
                                <TableCell className="text-right py-3"><InvoiceOptions invoiceUrl={charge.receipt_url || ""} /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

            </div>
        </div>
    )
}
