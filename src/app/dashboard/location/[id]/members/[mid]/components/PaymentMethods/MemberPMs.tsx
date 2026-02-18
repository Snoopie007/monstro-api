'use client'

import AddPaymentMethod from './AddMethod'

import { Elements } from '@stripe/react-stripe-js'
import { getStripe } from '@/libs/client/stripe'
import PaymentMethodsActions from './actions'
import { useMemberStatus } from '../../providers'
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
import { Member, CardPaymentMethod, UsBankAccountPaymentMethod, PaymentMethod } from '@subtrees/types'
interface PaymentMethodsProps {
    params: { id: string; mid: string }
    editable: boolean
}

export function PaymentMethods({ params }: PaymentMethodsProps) {
    const { member, paymentMethods } = useMemberStatus()



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
            {paymentMethods && paymentMethods.length > 0 ? (

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

const PAYMENT_ITEM_STYLES = "px-4 py-3 hover:bg-muted-foreground/5"

interface PaymentMethodItemProps {
    method: PaymentMethod;
    params: { id: string; mid: string };
    member: Member;
}


function PaymentMethodItem({
    method,
    params,
}: PaymentMethodItemProps) {
    if (method.type === "card") {
        const card = method.card as CardPaymentMethod;
        return (
            <Item variant="muted" className={PAYMENT_ITEM_STYLES}>
                <ItemContent className="flex flex-row justify-between items-center gap-2">
                    <span>{card.brand}</span>
                    <span>
                        credit •••• {card.last4}{" "}
                        {method.isDefault && (
                            <Badge roles="blue" size="tiny">
                                Default
                            </Badge>
                        )}
                    </span>
                    <span>
                        expires on {card.expMonth}/{card.expYear}
                    </span>
                </ItemContent>
                <ItemActions>
                    <PaymentMethodsActions
                        mid={params.mid}
                        paymentMethod={method}
                        lid={params.id}
                    />
                </ItemActions>
            </Item>
        );
    } else if (method.type === "us_bank_account") {
        const bank = method.usBankAccount as UsBankAccountPaymentMethod;
        return (
            <Item variant="muted" className={PAYMENT_ITEM_STYLES}>
                <ItemContent className="flex flex-row justify-between items-center gap-2">
                    <span>{bank.bankName} •••• {bank.last4}
                        {method.isDefault && (
                            <Badge roles="blue" size="tiny">
                                Default
                            </Badge>
                        )}
                    </span>
                    <span>
                        {bank.accountType}
                    </span>
                </ItemContent>
                <ItemActions>
                    <PaymentMethodsActions
                        mid={params.mid}
                        paymentMethod={method}
                        lid={params.id}
                    />
                </ItemActions>
            </Item>
        );
    } else {
        return null;
    }
}
