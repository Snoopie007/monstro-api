
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
import Stripe from 'stripe';
import { formatAmountForDisplay } from '@/libs/utils';
import { auth } from '@/auth';
import { StripePayments } from '@/libs/server/stripe';
import Wallet from './components/Wallet';
import { wallet } from './data';


type ClientStripeReturn = { paymentMethods: Stripe.PaymentMethod[], subscriptions: Stripe.Subscription[] }


async function fetchClientStripe(customerId: string): Promise<ClientStripeReturn> {

    try {
        const stripe = new StripePayments();
        const methods = await stripe.getPaymentMethods(customerId);
        const subscriptions = await stripe.getSubscriptions(customerId);

        return { paymentMethods: methods.data, subscriptions: subscriptions.data };
    } catch (error) {
        console.log("Error ", error);
        return { paymentMethods: [], subscriptions: [] };
    }
}



export default async function BillingPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const sesson = await auth();

    const { paymentMethods, subscriptions } = await fetchClientStripe(sesson?.user.stripeCustomerId);

    function calculateMonthlyTotal() {
        const total = subscriptions.reduce((total, sub) => {
            const plan = sub.items.data[0].plan;
            if (plan.amount) {
                return total + plan.amount;
            }
            return total;
        }, 0);

        return formatAmountForDisplay((total / 100), subscriptions[0].currency, true)
    }
    if (subscriptions.length == 0) {
        return (
            <div className='flex flex-col items-center justify-center h-full'>
                <p className='text-base font-medium'>Uh oh! No subscriptions found</p>
                <p className='text-sm text-muted-foreground'>Please contact support if you think this is an error.</p>
            </div>
        )
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
                                <TableHead className='pl-0'>Plan</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead >Next Invoice</TableHead>

                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscriptions && subscriptions.map(sub => {
                                const plan = sub.items.data[0].plan;
                                const amount = plan.amount || 0;
                                return (
                                    (
                                        <TableRow key={sub.id}>
                                            <TableCell className='pl-0'>{plan.nickname}</TableCell>
                                            <TableCell>{formatAmountForDisplay((amount / 100), plan.currency, true)}</TableCell>
                                            <TableCell >
                                                {new Date(sub.current_period_end * 1000).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </TableCell>
                                        </TableRow>
                                    )
                                )
                            })}
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
                <Wallet wallet={wallet} />
                <CardList paymentMethods={paymentMethods} customerId={sesson?.user.stripeCustomerId} locationId={params.id} />

            </div>
        </div >
    )
}
