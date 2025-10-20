'use client'

import AddPaymentMethod from './AddMethod'

import { Elements } from '@stripe/react-stripe-js'
import { getStripe } from '@/libs/client/stripe'
import PaymentMethodsActions from './actions'
import { useMemberStatus, useMemberPaymentMethods } from '../../providers'
import { Item, ItemActions, ItemContent, ItemMedia } from '@/components/ui/item'
import { CreditCard } from 'lucide-react'
import { Badge } from '@/components/ui'

interface PaymentMethodsProps {
    params: { id: string; mid: string }
    editable: boolean
}

export function PaymentMethods({ params, editable }: PaymentMethodsProps) {
    const { member } = useMemberStatus()
    const { paymentMethods } = useMemberPaymentMethods()

    const renderPaymentMethods = () => {
        return (
            <ul className="flex flex-col space-y-2">
                {paymentMethods.map((method, i) => (
                    <Item
                        key={i}
                        variant="muted"
                        className="flex flex-row items-center"
                    >
                        <ItemMedia>
                            <CreditCard size={14} />
                        </ItemMedia>
                        <ItemContent>
                            <div className="flex flex-row items-center gap-2">
                                <span className="uppercase">
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
                        </ItemContent>
                        <ItemActions>
                            <PaymentMethodsActions
                                mid={params.mid}
                                paymentMethod={method}
                                lid={params.id}
                                customerId={member.stripeCustomerId || ''}
                            />
                        </ItemActions>
                    </Item>
                ))}
            </ul>
        )
    }

    const renderEmpty = (
        <Item variant="muted" className="text-center py-4">
            <ItemContent>
                <div className="flex flex-col items-center justify-center">
                    <CreditCard
                        size={16}
                        className="text-muted-foreground mb-3"
                    />
                    <p className="text-md mb-1">No payment methods found</p>
                    <p className="text-sm text-muted-foreground">
                        Please add a payment method to get started
                    </p>
                </div>
            </ItemContent>
        </Item>
    )

    return (
        <div className="px-4 mb-4">
            <div className="flex flex-row items-center gap-2 mb-2">
                <span className="font-medium">Payment Methods</span>
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
            </div>
            {paymentMethods.length === 0 && renderEmpty}
            {paymentMethods.length > 0 && renderPaymentMethods()}
        </div>
    )
}
