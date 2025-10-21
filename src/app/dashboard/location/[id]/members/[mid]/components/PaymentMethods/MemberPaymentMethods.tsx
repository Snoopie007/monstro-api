'use client'

import AddPaymentMethod from './AddMethod'

import { Elements } from '@stripe/react-stripe-js'
import { getStripe } from '@/libs/client/stripe'
import PaymentMethodsActions from './actions'
import { useMemberStatus, useMemberPaymentMethods } from '../../providers'
import { ChevronsUpDown, CreditCard } from 'lucide-react'
import {
    Badge, CardTitle,
    CardHeader, Card, CardContent, Button, Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui'
import { useState } from 'react'

interface PaymentMethodsProps {
    params: { id: string; mid: string }
    editable: boolean
}

export function PaymentMethods({ params, editable }: PaymentMethodsProps) {
    const { member } = useMemberStatus()
    const { paymentMethods } = useMemberPaymentMethods()
    const [open, setOpen] = useState(false)


    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <Card className="bg-muted/50 rounded-lg  border-transparent">
                <CardHeader className='px-4 py-2 space-y-0 flex flex-row justify-between items-center'>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="hover:bg-transparent gap-1 px-0">
                            <CardTitle className='text-sm font-medium mb-0'>Payment Methods</CardTitle>

                            <ChevronsUpDown className="size-4" />
                            <span className="sr-only">Toggle</span>

                        </Button>
                    </CollapsibleTrigger>
                    <Elements
                        stripe={getStripe(
                            process.env.NEXT_PUBLIC_MEMBER_STRIPE_PUBLIC_KEY!
                        )}
                        options={{
                            appearance: {
                                variables: {
                                    colorIcon: '#6772e5',
                                    fontFamily:
                                        'Roboto, Open Sans, Segoe UI, sans-serif',
                                },
                            },
                        }}
                    >
                        {editable && (
                            <AddPaymentMethod
                                member={member}
                                locationId={params.id}
                            />
                        )}
                    </Elements>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className='px-4 pb-6 pt-1'>
                        {paymentMethods.length > 0 ? (

                            <ul className="flex flex-col space-y-2">
                                {paymentMethods.map((method, i) => (
                                    <PaymentMethodItem key={i} method={method} params={params} member={member} />
                                ))}
                            </ul>
                        ) : (

                            <div className="text-center py-4">
                                <div className="flex flex-col items-center justify-center">
                                    <CreditCard
                                        size={40}
                                        className="text-muted-foreground mb-3"
                                    />
                                    <p className="text-md mb-1">No payment methods found</p>
                                    <p className="text-sm text-muted-foreground">
                                        Please add a payment method to get started
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    )
}


function PaymentMethodItem({ method, params, member }: { method: any, params: { id: string; mid: string }, member: any }) {
    return (
        <li className=' flex flex-row justify-between py-1 items-center'>
            <div className="flex flex-row items-center gap-2">
                <span  >
                    {method.card?.brand}
                </span>
                <span className="text-sm text-muted-foreground">
                    {method.card?.funding} ••••{' '}
                    {method.card?.last4}{' '}
                    {method.allow_redisplay === 'always' && (
                        <Badge roles="blue" size="tiny">
                            Default
                        </Badge>
                    )}
                </span>
            </div>
            <div className="flex flex-row items-center gap-2">
                <span className="text-sm text-muted-foreground">
                    expires on {method.card?.exp_month}/
                    {method.card?.exp_year}
                </span>
            </div>
            <PaymentMethodsActions
                mid={params.mid}
                paymentMethod={method}
                lid={params.id}
                customerId={member.stripeCustomerId || ''}
            />
        </li >

    )
}