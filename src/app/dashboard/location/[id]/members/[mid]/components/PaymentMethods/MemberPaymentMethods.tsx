'use client'

import AddPaymentMethod from './AddMethod'

import { Elements } from '@stripe/react-stripe-js'
import { getStripe } from '@/libs/client/stripe'
import PaymentMethodsActions from './actions'
import { useMemberStatus, useMemberPaymentMethods } from '../../providers'
import { CreditCardIcon } from 'lucide-react'
import {
    Badge,
    Item, ItemContent,
    ItemActions,
    EmptyTitle,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    Empty
} from '@/components/ui'

interface PaymentMethodsProps {
    params: { id: string; mid: string }
    editable: boolean
}

export function PaymentMethods({ params, editable }: PaymentMethodsProps) {
    const { member } = useMemberStatus()
    const { paymentMethods } = useMemberPaymentMethods()



    return (
        <div className="space-y-2">
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
                <AddPaymentMethod member={member} locationId={params.id} />
            </Elements>
            {paymentMethods.length > 0 ? (

                <div className=" space-y-2">
                    {paymentMethods.map((method, i) => (
                        <PaymentMethodItem key={i} method={method} params={params} member={member} />
                    ))}
                </div>
            ) : (

                <Empty variant="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <CreditCardIcon className="size-5" />
                        </EmptyMedia>
                        <EmptyTitle>No payment methods found</EmptyTitle>
                        <EmptyDescription>Add a payment method to get started</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}

        </div >
    )
}


function PaymentMethodItem({ method, params, member }: { method: any, params: { id: string; mid: string }, member: any }) {
    return (
        <Item variant="muted" className='px-4 py-2 hover:bg-muted-foreground/5'>
            <ItemContent className='flex flex-row justify-between items-center gap-2'>
                <span  >
                    {method.card?.brand}
                </span>
                <span >
                    {method.card?.funding} ••••{' '}
                    {method.card?.last4}{' '}
                    {method.allow_redisplay === 'always' && (
                        <Badge roles="blue" size="tiny">
                            Default
                        </Badge>
                    )}
                </span>
                <span >
                    expires on {method.card?.exp_month}/
                    {method.card?.exp_year}
                </span>

            </ItemContent>
            <ItemActions>
                <PaymentMethodsActions
                    mid={params.mid}
                    paymentMethod={method}
                    lid={params.id}
                    customerId={member.stripeCustomerId || ''}
                />
            </ItemActions>
        </Item >

    )
}