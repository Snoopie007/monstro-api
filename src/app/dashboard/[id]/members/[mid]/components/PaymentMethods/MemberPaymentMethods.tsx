'use client'
import {
    Card,
    CardHeader,
    CardContent,
    CardTitle,
} from "@/components/ui"
import AddPaymentMethod from "./AddMethod"

import { Elements } from "@stripe/react-stripe-js"
import { getStripe } from "@/libs/stripe"
import PaymentMethodsActions from "./actions"
import { useMember, useMemberPaymentMethods } from "../../providers/MemberContext"

interface PaymentMethodsProps {
    stripeKey: string | null
    params: { id: string, mid: number },
}

export function PaymentMethods({ stripeKey, params }: PaymentMethodsProps) {
    const { member, mutate } = useMember()
    const { paymentMethods, addPaymentMethods } = useMemberPaymentMethods()

    return (
        <Card className='rounded-sm'>
            <CardHeader className='border-b space-y-0 p-0 flex justify-between flex-row items-center ' >
                <CardTitle className="text-sm  px-4">
                    Payment Methods
                </CardTitle>
                {stripeKey && (
                    <Elements
                        stripe={getStripe(stripeKey)}
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
                )}


            </CardHeader>
            <CardContent className='p-0' >
                <ul>
                    {paymentMethods.map((method, i) => (
                        <li key={i} className='border-b last-of-type:border-b-0 flex flex-row gap-4   py-3 px-4 items-center'>
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
            </CardContent>
        </Card >
    )
}
