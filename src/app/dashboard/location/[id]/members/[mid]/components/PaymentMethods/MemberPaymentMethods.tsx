'use client'
import {
    Card,
    CardHeader,
    CardContent,
    CardTitle,
} from "@/components/ui"
import AddPaymentMethod from "./AddMethod"

import { Elements } from "@stripe/react-stripe-js"
import { getStripe } from "@/libs/client/stripe"
import PaymentMethodsActions from "./actions"
import { useMemberStatus, useMemberPaymentMethods } from "../../providers"

interface PaymentMethodsProps {
    params: { id: string, mid: number },
}

export function PaymentMethods({ params }: PaymentMethodsProps) {
    const { member } = useMemberStatus()
    const { paymentMethods, addPaymentMethods } = useMemberPaymentMethods()

    return (
        <Card className='border-x-0 border-t border-b-0 border-foreground/10'>
            <CardHeader className='border-b border-foreground/10 space-y-0 bg-foreground/5 p-0 flex justify-between flex-row items-center ' >
                <CardTitle className="text-sm  px-4">
                    Payment Methods
                </CardTitle>
                <Elements
                    stripe={getStripe(process.env.STRIPE_MEMBER_SECRET_KEY!)}
                    options={{
                        appearance: {
                            variables: {
                                colorIcon: "#6772e5",
                                fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
                            },
                        },
                    }}
                >
                    <AddPaymentMethod member={member} locationId={params.id} />
                </Elements>


            </CardHeader>
            <CardContent className='p-0' >
                {paymentMethods.length === 0 && (
                    <div className='text-center py-4'>
                        <p className='text-sm text-muted-foreground'>No payment methods found</p>
                    </div>
                )}
                {paymentMethods.length > 0 && (
                    <ul>
                        {paymentMethods.map((method, i) => (
                            <li key={i} className='border-b border-foreground/10 last-of-type:border-b-0 flex flex-row gap-4   py-3 px-4 items-center'>
                                <div className='text-sm flex-1 items-center'>
                                    <span className='capitalize'>{method.card?.brand} {" "}</span>
                                    {method.card?.funding} •••• {method.card?.last4}
                                    {/* {method.id && (
                                     <span className='bg-indigo-400 text-indigo-800  rounded-full text-xs  font-medium px-2 py-0.5  ml-2'>Default</span>
                                 )} */}
                                </div>
                                <div className='text-sm flex-1 text-right'>
                                    <p>expires on {method.card?.exp_month}/{method.card?.exp_year}</p>
                                </div>
                                <PaymentMethodsActions memberId={params.mid} paymentMethod={method} locationId={params.id} customerId={member.stripeCustomerId || ""} />
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card >
    )
}
