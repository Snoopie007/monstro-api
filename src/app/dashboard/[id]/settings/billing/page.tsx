
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    Table,
    TableBody,
    TableHeader,
    TableCell,
    TableHead,
    TableRow
} from '@/components/ui'

import Link from 'next/link'
import React from 'react'

import CardList from './components/CardList';
import { cn, formatAmountForDisplay } from '@/libs/utils';
import { auth } from '@/auth';
import { StripePayments } from '@/libs/server/stripe';
import Wallet from './components/Wallet';
import { LocationProgress } from '@/types/location';



async function fetchClientStripe(customerId: string, locationId: string, progress: LocationProgress) {

    try {
        let subscriptions = [{
            name: "Pay as you go",
            amount: 0,
            nextInvoice: "N/A",
            endDate: "N/A",
            currency: "USD"
        }]
        const stripe = new StripePayments();
        const methods = await stripe.getPaymentMethods(customerId);
        if (progress.planId !== 0) {
            const res = await stripe.getSubscriptions(customerId);

            subscriptions = res.data
                .filter(sub => sub.metadata.locationId === locationId)
                .map(sub => {
                    const plan = sub.items.data[0]?.plan;

                    const dateFormat: Intl.DateTimeFormatOptions = {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    };
                    return {
                        name: plan?.nickname || "N/A",
                        amount: plan?.amount || 0,
                        nextInvoice: new Date(sub.current_period_end * 1000).toLocaleString('en-US', dateFormat),
                        endDate: sub.cancel_at ? new Date(sub.cancel_at * 1000).toLocaleString('en-US', dateFormat) : "N/A",
                        currency: plan?.currency || "USD"
                    }
                });

        }


        return { paymentMethods: methods.data, subscriptions };
    } catch (error) {
        console.log("Error ", error);
        return { paymentMethods: [], subscriptions: [] };
    }
}



export default async function BillingPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const sesson = await auth();

    const location = sesson?.user.locations.find((location: { id: string, progress: LocationProgress }) => location.id === params.id);

    const { paymentMethods, subscriptions } = await fetchClientStripe(sesson?.user.stripeCustomerId, params.id, location?.progress)

    function calculateMonthlyTotal() {
        const total = subscriptions.reduce((total, sub) => {

            if (sub.amount) {
                return total + sub.amount;
            }
            return total;
        }, 0);

        return formatAmountForDisplay((total / 100), subscriptions[0]?.currency || "USD", true)
    }

    return (
        <div>
            <Card className=' mb-6'>
                <CardHeader className='border-b p-0 space-y-0  justify-between flex flex-row items-center'>
                    <CardTitle className='text-base py-2 px-4 '>Your Monstro Subscriptions</CardTitle>
                    <Link href={"#"} className='text-sm bg-transparent hover:bg-accent inline-flex p-2.5 font-medium  h-full border-l'>
                        Change Plan
                    </Link>
                </CardHeader>
                <CardContent className='py-6 px-5'>
                    <Table className='w-full border-b mb-4'>
                        <TableHeader >
                            <TableRow>
                                {["Plan", "Amount", "Next Invoice", "End Date"].map((header, i) => (
                                    <TableHead key={header} className={cn('h-auto py-2', i === 0 && 'pl-0')}>
                                        {header}
                                    </TableHead>
                                ))}

                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscriptions.length > 0 ? subscriptions.map((sub, i) => (
                                <TableRow key={i}>
                                    <TableCell className='pl-0'>{sub.name}</TableCell>
                                    <TableCell>{formatAmountForDisplay((sub.amount / 100), sub.currency, true)}</TableCell>
                                    <TableCell >
                                        {sub.nextInvoice}
                                    </TableCell>
                                    <TableCell >
                                        {sub.endDate}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className='text-center'>No subscriptions found</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <div>
                        <p className='font-medium'>Total: {calculateMonthlyTotal()}</p>
                    </div>
                </CardContent>
                <CardFooter className=' border-t text-foreground py-2 text-sm '>
                    Have a Question? <Link href={`/dashboard/${params.id}/support`} className='ml-1 text-indigo-500'>Contact Support</Link>
                </CardFooter>
            </Card>
            <div className='grid grid-cols-2 gap-4'>
                <Wallet lid={params.id} />
                <CardList paymentMethods={paymentMethods} customerId={sesson?.user.stripeCustomerId} locationId={params.id} />

            </div>
        </div >
    )
}
