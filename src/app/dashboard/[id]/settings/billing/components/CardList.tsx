'use client'
import { Card, CardContent, CardHeader, CardTitle, ScrollArea, Skeleton } from '@/components/ui'

import React from 'react'
import AddCard from './AddCard';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/libs/stripe';
import Stripe from 'stripe';
import CardActions from './CardAction';

interface CardListProps {
    paymentMethods: Stripe.PaymentMethod[]
    locationId: string
    customerId: string
}

export function CardList({ paymentMethods, locationId, customerId }: CardListProps) {

    return (
        <Card className=''>
            <CardHeader className='border-b p-0 space-y-0 flex flex-row justify-between'>
                <CardTitle className='text-sm py-2 px-4'>Payment Method</CardTitle>
                <div>
                    {process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY && (
                        <Elements
                            stripe={getStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY)}
                            options={{
                                appearance: {
                                    variables: {
                                        colorIcon: "#6772e5",
                                        fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
                                    },
                                },
                            }}
                        >
                            <AddCard customerId={customerId} locationId={locationId} />
                        </Elements>
                    )}
                </div>
            </CardHeader>
            <CardContent className=' p-0  '>
                <ScrollArea className='h-[180px]'>
                    {paymentMethods ? (
                        <ul className=''>
                            {paymentMethods.map((method, i) => (
                                <li key={i} className='border-b last-of-type:border-b-0 flex flex-row justify-between py-3 px-4 items-center'>
                                    <div className='text-xs'>
                                        <span className='capitalize'>{method.card?.brand} {" "}</span>
                                        {method.card?.funding} •••• {method.card?.last4}
                                        {method.allow_redisplay === "always" && (
                                            <span className='bg-indigo-500  rounded-full text-xs text-white  px-3 py-0.5 ml-2'>Default</span>
                                        )}
                                    </div>
                                    <div className=' flex flex-row items-center gap-3 text-xs'>
                                        <p>Valid until {method.card?.exp_month}/{method.card?.exp_year}</p>
                                        <CardActions paymentMethod={method} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <>
                            <Skeleton className='h-4 w-full' />
                        </>
                    )}
                </ScrollArea>
            </CardContent>

        </Card>
    )
}
