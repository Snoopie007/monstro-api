'use client'
import { Badge, Skeleton } from '@/components/ui'

import React from 'react'
import AddCard from './AddCard';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/libs/client/stripe';
import Stripe from 'stripe';
import CardActions from './CardAction';

interface CardListProps {
    paymentMethods: Stripe.PaymentMethod[]
    locationId: string
    customerId: string
}

export function CardList({ paymentMethods, locationId, customerId }: CardListProps) {
    return (
        <div className='space-y-1'>
            <div className='font-medium'>Payment Methods</div>
            <div className='flex flex-col gap-2'>
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
                {paymentMethods && paymentMethods.length > 0 ? (
                    <div>
                        {paymentMethods.map((method, i) => (
                            <div key={i} className='bg-foreground/5 rounded-lg p-4 flex flex-row justify-between items-center'>
                                <div className=' flex flex-row items-center gap-2'>
                                    <span className='capitalize'>{method.card?.brand}{" "}</span>
                                    {method.card?.funding} •••• {method.card?.last4}
                                    {method.allow_redisplay === "always" && (
                                        <Badge roles="blue" >Default</Badge>
                                    )}
                                </div>
                                <div className='flex flex-row items-center gap-3'>
                                    <p>Valid until {method.card?.exp_month}/{method.card?.exp_year}</p>
                                    <CardActions paymentMethod={method} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className='flex flex-col gap-2'>
                        <Skeleton className='h-6 w-full' />
                        <Skeleton className='h-6 w-full' />
                    </div>
                )}
            </div>
        </div>
    )
}
